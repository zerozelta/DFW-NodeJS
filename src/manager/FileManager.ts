import { promisify } from "util";
import DFWInstance from "../DFWInstance";
import { DFWRequest } from "../types/DFWRequestScheme";
import DFWModule from "./DFWModule";
import md5File from 'md5-file';

import { Response, Request } from "express";

import * as fs from "fs";
import * as path from "path";
import DFWUtils from "../DFWUtils";
import { dfw_file, dfw_user } from "@prisma/client";
import fileUpload, { UploadedFile } from "express-fileupload";
import { DateTime } from "luxon";

const fileExistsAsync = promisify(fs.exists);
const fileRenameAsync = promisify(fs.rename);
const fileMakeDir = promisify(fs.mkdir);
const fileMakeTempDir = promisify(fs.mkdtemp);
const fileStat = promisify(fs.stat);
const fileUnlink = promisify(fs.unlink);
const fileCopy = promisify(fs.copyFile);

type FileConfig = {
    protected?: boolean | any[];
    expiration?: Date;
    ext?: string;
    slug?: string;
    description?: string;
    user?: dfw_user | number | null;
    parent?: number | dfw_file;  // file parent for file trees
    variant?: string;          // file variant to diferenciate from another childs
    replaceVariants?: boolean;
}

export type UploadConfig = {
    headers?: any;
    highWaterMark?: number;
    fileHwm?: number;
    defCharset?: string;
    preservePath?: boolean;
    limits?: {
        fieldNameSize?: number;
        fieldSize?: number;
        fields?: number;
        fileSize?: number;
        files?: number;
        parts?: number;
        headerPairs?: number;
    };
}

const DEFAULT_PUBLIC_STATIC_FILES_PATH = "/static/upload";
const LOCAL_PUBLIC_UPLOAD_DIR = ".dfw/upload/public";
const LOCAL_PROTECTED_UPLOAD_DIR = ".dfw/upload/protected";

export default class FileManager extends DFWModule {

    readonly tmpDir: string;
    readonly publicStaticFilesPath = DEFAULT_PUBLIC_STATIC_FILES_PATH;

    constructor(DFW: DFWInstance) {
        super(DFW);

        if (DFW.config.upload && DFW.config.upload.tempDir) {
            this.tmpDir = DFW.config.upload.tempDir;
        } else {
            this.tmpDir = ".dfw/temp";
        }

        if (fs.existsSync(this.tmpDir)) {
            fs.rmSync(this.tmpDir, { recursive: true });
            fs.mkdirSync(this.tmpDir);
        } else {
            fs.mkdirSync(this.tmpDir);
        }

        this.tmpDir = path.normalize(fs.mkdtempSync(`${this.tmpDir}${path.sep}`));

        // Public static upload path
        //DFW.APIManager.server.use(this.publicStaticFilesPath, ExpressStatic(LOCAL_PUBLIC_UPLOAD_DIR, { maxAge: 2592000 }));

        // Clear expired files each 6 hours
        /*
        setInterval(() => { 
            this.sweepExpiredFilesAsync();
        }, 21600000);
        */
    }

    public middleware = async (req: DFWRequest, res: Response) => {
        req.dfw.FileManager = this;

    }

    /**
     * Takes a local tmp file and move to the files on DFW folder and save db record
     */
    public async assignLocalFileAsync(filePath: string, cfg: FileConfig, moveLocalFile: boolean = false) {

        if (await fileExistsAsync(filePath) == false) {
            throw `Process uploaded file async error, unable to find file ${filePath}`;
        }

        let checksum = await md5File(filePath);
        let stats = await fileStat(filePath);
        let filename = `${DFWUtils.uuid()}.${cfg.ext ?? DFWUtils.getFilenameExtension(filePath)}`;
        let mimetype = DFWUtils.getFileMimetype(filename);
        let partialPath = `${cfg.protected ? LOCAL_PROTECTED_UPLOAD_DIR : LOCAL_PUBLIC_UPLOAD_DIR}/${DateTime.now().toFormat("y/MM")}`
        let expire = cfg.expiration ? cfg.expiration : null;
        let finalFilePath = `${partialPath}/${filename}`;
        let description = cfg.description;
        let variant = cfg.variant;
        let idParent = typeof cfg.parent == "object" ? cfg.parent.id : cfg.parent;

        if (await fileExistsAsync(partialPath) == false) {
            await fileMakeDir(partialPath, { recursive: true });
        }

        if (moveLocalFile) {
            await fileRenameAsync(filePath, finalFilePath).catch((e) => {
                throw new Error("Process uploaded file async error, unable to move file uploaded: " + e);
            })
        } else {
            await fileCopy(filePath, finalFilePath).catch((e) => {
                throw new Error("Process uploaded file async error, unable to copy file uploaded: " + e);
            });
        }

        return this.db.$transaction(async () => {
            // Removing same variant if has variant and parent
            if (cfg.parent && cfg.variant) {
                let dfl = await this.db.dfw_file.findMany({
                    where: {
                        idParent,
                        variant,
                    }
                });
                for (let df of dfl) { await this.removeFileAsync(df); }
            }

            return this.db.dfw_file.create({
                data: {
                    idParent,
                    mimetype,
                    checksum,
                    expire,
                    variant,
                    description,
                    path: finalFilePath,
                    idUser: cfg.user === null ? null : typeof cfg.user == "object" ? cfg.user.id : cfg.user,
                    slug: cfg.slug,
                    size: stats.size,
                }
            });
        })
    }

    /**
     * 
     * @param bodyFileName 
     * @param cfg 
     */
    public async flushUpload(req: DFWRequest, file: string, cfg: FileConfig = {}) {
        if (!req.files) throw `DFW_ERROR_UPLOAD_ENPOINT_MUST_BE_ENABLED`;
        if (!req.files[file]) throw `DFW_ERROR_UNABLE_TO_FOUND_FILE_UPLOAD_NAME`;
        
        if (Array.isArray(!req.files[file])) {
            return (req.files[file] as UploadedFile[]).map(async (fileData, index) => {
                return await this.assignLocalFileAsync(fileData.tempFilePath, Object.assign({
                    user: req.dfw.session.user,
                    ext: DFWUtils.getFilenameExtension(fileData.name)
                }, cfg), true);
            })
        } else {
            return await this.assignLocalFileAsync((req.files[file] as UploadedFile).tempFilePath, Object.assign({
                user: req.dfw.session.user,
                ext: DFWUtils.getFilenameExtension((req.files[file] as UploadedFile).name)
            }, cfg), true);
        }
    }

    public generateTempFileName(posfix?: string) {
        return path.join(this.tmpDir, `${DFWUtils.uuid()}${posfix ? `.${posfix}` : ""}`);
    }

    /**
     * Remove file record from the DB and from the local file space (removes their children too)
     */
    public async removeFileAsync(file: number | dfw_file) {
        let path: string;
        let idFile = typeof file == "object" ? file.id : file;
        let fileObj = typeof file == "object" ? file : await this.db.dfw_file.findUnique({ select: { path: true }, where: { id: idFile } });

        if (fileObj) {
            path = fileObj.path;
        } else {
            throw `Unable to find file`
        }

        let childrenFiles = await this.db.dfw_file.findMany({
            where: {
                idParent: idFile
            }
        });

        for (let fc of childrenFiles) {
            if (fc) await this.removeFileAsync(fc); // Remove all children files
        }

        if (fs.existsSync(path)) {
            await fileUnlink(path).then(() => {
                this.db.dfw_file.delete({
                    where: {
                        id: idFile
                    }
                });
            }).catch(() => { throw `Unable to remove file ${idFile}` });
        }

    }


    /**
     * 
     */
    public async sweepExpiredFilesAsync() {

    }

}