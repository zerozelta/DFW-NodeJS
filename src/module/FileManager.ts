import fileUpload from "express-fileupload";
import { Op } from "sequelize";
import { promisify } from "util";
import md5File from 'md5-file/promise';
import DFWInstance from "../script/DFWInstance";
import dfw_file from "../model/dfw_file";
import DFWModule from "../script/DFWModule";
import moment from "moment";
import DFWUtils from "../script/DFWUtils";
import DatabaseManager from "./DatabaseManager";
import dfw_user from "../model/dfw_user";
import { Request, Response, NextFunction, static as ExpressStatic } from "express";

import * as fs from "fs";
import * as nodejsPath from "path";

const fileExistsAsync       = promisify(fs.exists);
const fileRenameAsync       = promisify(fs.rename);
const fileMakeDir           = promisify(fs.mkdir);
const fileMakeTempDir       = promisify(fs.mkdtemp);
const fileStat              = promisify(fs.stat);
const fileUnlink            = promisify(fs.unlink);
const fileCopy              = promisify(fs.copyFile);


export type UploadOptions = {
    path?:string;                       // Destination path relative to root of the project
    name?:string;                       // filename
    slug?:string;                       // sllug for file
    ext?:string;                        // file extensión
    expiration?:Date|moment.Moment|null;// Expiration of a the file in the server (null is never expire) (by default never expire)
    access?:number;                     // acces type defined by the access constants in dfw_file model
    description?:string;                // description text for help or alt attributes

    user?:number|dfw_user;
    parent?:dfw_file|number;            // file parent for file trees
    variant?:string;                    // file variant to diferenciate from another childs

    removeSource?:boolean;              // delete origin file (for tmp files)
    removeSameVariants?:boolean;        // if the file has parent remove all file children with the same variant value (default false)
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

export type FileRecord = {
    id:number;
    description:string;
    url:string;
    size:number;
    expire:Date;
    created:Date;
    children:{[variant:string]:string};
}

export type FileRecordOptions = {
    
}

export interface UploadedFile {
    name: string;
    encoding: string;
    mimetype: string;
    data: Buffer;
    size: number;
    tempFilePath: string;
    truncated: boolean;
    md5: string;
    mv(path: string, callback: (err: any) => void): void;
    mv(path: string): Promise<void>;
}

export default class FileManager extends DFWModule{

    static readonly ACCESS_PUBLIC         = 0; // Everybody can access and every user can manage
    static readonly ACCESS_SESSION        = 1; // Onli loged user can access but every user can manage
    static readonly ACCESS_PRIVATE        = 2; // Onli the owner user and ADMIN can access and manage
    static readonly ACCESS_PROTECTED      = 3; // every body can access but is managed onli for uploader and ADMIN

    private readonly TMPDIR:string;
    
    constructor(DFW:DFWInstance){
        super(DFW);

        if(DFW.config.upload && DFW.config.upload.tempDir){
            this.TMPDIR = DFW.config.upload.tempDir;
        }else{
            this.TMPDIR = ".dfw/temp";
        }
        
        if(fs.existsSync(this.TMPDIR)){
            fs.rmdirSync(this.TMPDIR,{recursive:true});
            fs.mkdirSync(this.TMPDIR);
        }else{
            fs.mkdirSync(this.TMPDIR);
        }

        this.TMPDIR = nodejsPath.normalize(fs.mkdtempSync(`${this.TMPDIR}${nodejsPath.sep}`));
        
        DFW.server.use(this.getStaticUploadPath(),ExpressStatic(this.getLocalUploadDir(),{maxAge:2592000})) // Public static upload path

        setInterval(()=>{ // Clear expired files each 6 hours
            this.purge();
        },21600000);
    }

    public middleware = (req:Request,res:Response,next:NextFunction)=>{
        req.dfw.file = {
            validateFileAsync: async (file:number|dfw_file|FileRecord,expire:Date|null = null)=>{
                return await this.validateFileAsync(file,expire);
            },
            invalidateFileAsync: async (file:number|dfw_file|FileRecord)=>{
                return await this.invalidateFileAsync(file);
            },
            flushUploadAsync: async (file:UploadedFile|string,config:UploadOptions = {})=>{
                return await this.flushUploadAsync(req,file,config);
            },
            getFileRecordAsync: async (file:number|number[]|dfw_file|dfw_file[],options?:FileRecordOptions)=>{
                return await this.getFileRecordAsync(file,options);
            },
            assingLocalFileAsync:async (filePath:string,options?:UploadOptions)=>{
                return await this.assingLocalFileAsync(filePath,options);
            },
            assignFileChild: async (localFilePath:string,parent:number|dfw_file|FileRecord,options:UploadOptions = {})=>{
                return this.assignChildLocalFileAsync(localFilePath,parent,options);
            },
            getFileRecord: (file:dfw_file|dfw_file[])=>{
                return this.getFileRecord(file);
            },
            checkFileAccessAsync: async (file:number|dfw_file)=>{
                return await this.checkFileAccessAsync(req,file);
            },
            removeFileAsync: async (file:number|dfw_file|FileRecord)=>{
                return await this.removeFileAsync(file);
            },
        }

        next();
    }

    /**
     * Flushes the uploaded file to save in DFW database
     * @param dfw 
     * @param currentPath 
     * @param config 
     */
    public async flushUploadAsync(req:Request,fileReference:UploadedFile|string,config:UploadOptions):Promise<dfw_file>{
        
        let file = ( typeof fileReference == "string" ? req.files![fileReference] :fileReference ) as UploadedFile;
        let currentPath = file.tempFilePath;

        if(file === undefined || file === null){
            throw new Error("File cannot be undefined");
        }

        if(file.truncated === true){
            await fileUnlink(file.tempFilePath);
            throw new Error(`maximum file size exceeded (${(file.size/1024).toFixed(0)} Kb)`);
        }
        
        return this.assingLocalFileAsync(currentPath,{...config, name:file.name });
    }


    /**
     * 
     * @param file 
     */
    public async invalidateFileAsync(file:number|dfw_file|FileRecord):Promise<dfw_file>{
        let fileId:number = typeof file == "number" ? file : file.id;

        let fileObj:dfw_file|null;

        if(file instanceof dfw_file){
            fileObj = file;
        }else{
            fileObj = await dfw_file.findByPk(fileId)
        }

        if(!fileObj){
            throw `Error file with id ${fileId} not exists`;
        }

        fileObj.expire = moment().toDate();
        return await fileObj.save();
    }

    /**
     * 
     * @param file 
     * @param expire 
     */
    public async validateFileAsync(file:number|dfw_file|FileRecord,expire:Date|null = null):Promise<dfw_file>{
        let fileId:number = typeof file == "number" ? file : file.id;

        let fileObj:dfw_file|null;

        if(file instanceof dfw_file){
            fileObj = file;
        }else{
            fileObj = await dfw_file.findByPk(fileId)
        }

        if(!fileObj){
            throw `Error file with id ${fileId} not exists`;
        }

        if(expire === null || expire instanceof Date){
            fileObj.expire = expire;
        }else if(typeof expire == "number"){
            fileObj.expire = moment().add("days",expire).toDate();
        }
        
        return await fileObj.save();
    }

    /**
     * 
     * @param dfw 
     * @param filePath 
     * @param options 
     */
    public async assingLocalFileAsync(filePath:string,options:UploadOptions = {}):Promise<dfw_file>{

        if(await fileExistsAsync(filePath) == false){
            throw new Error(`Process uploaded file async error, unable to find file ${filePath}`);
        }

        let originalBaseName = nodejsPath.basename(options.name?options.name:filePath);
        let fileParent:dfw_file|undefined|null = options.parent ? typeof options.parent == "object" ? options.parent : await dfw_file.findByPk(options.parent) : undefined;
        let idUser:number|undefined|null = options.user ? typeof options.parent == "object" ? (options.user as dfw_user).id : options.user as number: undefined;
        let access:number|undefined|null = options.access ?? FileManager.ACCESS_PUBLIC;

        if(fileParent){
            idUser = fileParent.idUser;
            access = fileParent.access;
        } 

        let md5 = await md5File(filePath);
        let stats = await fileStat(filePath);
        let mimetype = DFWUtils.getMimetype(options.ext?options.ext:originalBaseName);
        let ext = options.ext?options.ext:DFWUtils.getExtension(originalBaseName);
        let filename = `${DFWUtils.uuid()}.${ext}`;
        let partialPath = moment().format("YYYY/MM");
        let path = options.path?options.path:`${this.getLocalUploadDir()}`;
        let expire = options.expiration ? options.expiration : null;
        let finalFilePath = `${path}/${partialPath}/${filename}`;
        let description = options.description?options.description:DFWUtils.getBaseName(originalBaseName);
        let variant = options.variant ? options.variant : null;
        let idFileParent = fileParent ? fileParent.id : null;

        if(await fileExistsAsync(`${path}/${partialPath}`) == false){
            await fileMakeDir(`${path}/${partialPath}`,{recursive:true});
        }

        if(options.removeSource){
            await fileRenameAsync(filePath,finalFilePath).catch((e)=>{
                throw new Error("Process uploaded file async error, unable to move file uploaded: " + e);
            })
        }else{
            await fileCopy(filePath,finalFilePath).catch((e)=>{
                throw new Error("Process uploaded file async error, unable to copy file uploaded: " + e);
            });
        }

        // Removing same variant if cfg flag removeSameVariants is true
        //TODO allow delete same variant not only on child files but also in root files (check if is secure)
        if(options.removeSameVariants && fileParent && fileParent.variant){
            let dfl = await dfw_file.findAll({
                where:{
                    idFileParent:fileParent.id,
                    variant: fileParent.variant
                }
            });
            for(let df of dfl){ await this.removeFileAsync(df); }
        }

        return dfw_file.create({
            slug:options.slug,
            size:stats.size,
            name:filename,
            checksum:md5,
            description,
            expire,
            mimetype,
            path,
            variant,
            partialPath,
            idUser,
            access,
            idFileParent,
        });
    }

    /**
     * 
     * @param dfw 
     * @param localFilePath 
     * @param parent 
     * @param variant 
     * @param options 
     */
    public async assignChildLocalFileAsync(localFilePath:string,parent:number|dfw_file|FileRecord,options:UploadOptions = {}):Promise<dfw_file>{
        return this.assingLocalFileAsync(localFilePath,Object.assign(options,{ parent : typeof parent == "number" ? parent:parent.id }));
    }

    /**
     * @param file 
     */
    public getFileRecord(file:dfw_file|dfw_file[],options:FileRecordOptions = {}):FileRecord|FileRecord[]{
        if(Array.isArray(file)){
            return file.map((f)=>this.getFileRecord(f,options) as FileRecord);
        }else{
            let children = {};

            if(file.children){
                file.children.map((cf)=>{
                    if(cf.variant && cf.variant != ""){
                        children[`${cf.variant}`] = cf.url;
                    }
                })
            }

            return {
                id:file.id,
                url:file.url,
                size:file.size,
                description:file.description,
                expire:file.expire,
                checksum:file.checksum,
                created:file.created_at,
                children    
            } as FileRecord;
        }
    }

    /**
     * Static method
     * @param DFW 
     * @param file 
     */
    public async getFileRecordAsync(file:number|dfw_file|number[]|dfw_file[],options:FileRecordOptions = {}):Promise<FileRecord|FileRecord[]|undefined>{
        
        if(!file) return;

        if(Array.isArray(file)){
            let res = [] as FileRecord[];
            for(let f of file){
                res.push((await this.getFileRecordAsync(f,options)) as any);
            }
            return res;
        }

        if(file instanceof dfw_file){
            return this.getFileRecord(file,options);
        }else{
            return await this.getFileRecordAsync((await this.instance.DatabaseManager.database.getModel("dfw_file").findByPk(file,{
                include:[
                    { association:"children" }
                ]
            }),options) as any);
        }
    }


    /**
     * 
     */
    public getLocalPrivateUploadDir(){
        if(this.instance.config.upload !== undefined && this.instance.config.upload.localUploadDir !== undefined) return this.instance.config.upload.localUploadDir;
        return ".dfw/upload/private";
    }

    /**
     * 
     */
    public getLocalUploadDir(){
        if(this.instance.config.upload !== undefined && this.instance.config.upload.localUploadDir !== undefined) return this.instance.config.upload.localUploadDir;
        return ".dfw/upload/public";
    }

    /**
     * 
     */
    public getStaticUploadPath(){
        if(this.instance.config.upload !== undefined && this.instance.config.upload.staticUploadPath !== undefined) return this.instance.config.upload.staticUploadPath;
        return "/upload";
    }

    public generateTempFileName(posfix?:string){
        return nodejsPath.join(this.TMPDIR,`${DFWUtils.uuid()}${posfix ? `.${posfix}`:""}`);
    }

    /**
     * 
     */
    public getStaticUploadSlugPath(){
        return nodejsPath.join(this.getStaticUploadPath(),"/s");
    }

    /**
     * Generate pre-configured middleware for file uploading
     * @param config 
     */
    public makeUploadMiddleware(config?:UploadConfig|boolean){
        if(typeof config == "boolean"){
            config = {};
        }
        
        return fileUpload(Object.assign({  limits: { fileSize: (5 * 1024 * 1024) } }, config, { useTempFiles : true , tempFileDir : this.TMPDIR }));
    }

    /**
     * 
     * @param file 
     */
    public async removeFileAsync(file:number|dfw_file|FileRecord){
        if(!file) throw `File record is null or undefined`;

        if(file instanceof dfw_file){
            if(!file.children) file.children = await file.$get("children");
            
            for(let fc of file.children){
                if(fc) await this.removeFileAsync(fc); // Remove all children files
            }
            let path = file.localPath;
            if(fs.existsSync(path)){
                await fileUnlink(path).then(()=>{
                    file.destroy();
                }).catch(()=>{ throw `Unable to remove file`})
            }else{
                file.destroy();
            }
        }else{
            let fo = await dfw_file.findByPk(typeof file == "number" ? file:file.id);
            if(fo){ return this.removeFileAsync(fo); }
        }
    }

    /**
     * TODO
     * @param dfw 
     * @param file 
     */
    public async checkFileAccessAsync(req:Request,file:number|dfw_file|FileRecord):Promise<boolean>{
        return false;
    }

    public getFileURL(file:dfw_file){
        return `${this.getStaticUploadPath()}/${file.partialPath}/${file.name}`;
    }

    public getFileLocalPath(file:dfw_file){
        return `${file.path}/${file.partialPath}/${file.name}`;
    }

    /**
     * Delete all expired uploaded files in the local file system
     */
    public async purge(){
        let data:dfw_file[] = await this.instance.getModule(DatabaseManager).getModel("dfw_file").findAll({ where:{ expire:{ [Op.lt] : moment() }}}) as any;

        data.forEach((file)=>{
            fileUnlink(file.path).then(()=>{    // remove file
                file.destroy();                 // remove record db
            });
        });
    }
}

export interface DFWFileScheme{
    /**
     * Flushes the upload with the file and uploadConfig
     */
    flushUploadAsync: (file:UploadedFile|string,config?:UploadOptions)=>Promise<dfw_file|null>

    /***
     * 
     */
    getFileRecordAsync:(file:number|dfw_file|number[]|dfw_file[],options?:FileRecordOptions)=>Promise<FileRecord|FileRecord[]|undefined>;

    /***
     * 
     */
    getFileRecord:(file:dfw_file|dfw_file[])=>FileRecord|FileRecord[]|null;

    /**
     * 
     */
    checkFileAccessAsync:(file:number|dfw_file)=>Promise<boolean>

    /**
     * by default set the expire value to "never" ot to specific date
     */
    validateFileAsync:(file:number|dfw_file|FileRecord,expire?:Date|null)=>Promise<dfw_file>;

    /**
     * invalidate file to be remvoed in netx purge operation
     */
    invalidateFileAsync:(file:number|dfw_file|FileRecord)=>Promise<dfw_file>;

    /**
     * remvoe file instantantly
     */
    removeFileAsync:(file:number|dfw_file|FileRecord)=>Promise<void>;


    /**
     * save a local file in database record
     */
    assingLocalFileAsync:(filePath:string,options?:UploadOptions)=>Promise<dfw_file>

    /**
     * assing local file as a children of previus created record
     */
    assignFileChild:(path:string,parent:number|dfw_file|FileRecord,options?:UploadOptions)=>Promise<dfw_file>
}
