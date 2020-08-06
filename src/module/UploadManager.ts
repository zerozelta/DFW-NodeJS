import fileUpload from "express-fileupload";
import { Op } from "sequelize";
import { promisify, isArray, isNumber, isBoolean, isString } from "util";
import md5File from 'md5-file/promise';
import DFWInstance from "../script/DFWInstance";
import dfw_file from "../model/dfw_file";
import DFWModule from "../script/DFWModule";
import moment from "moment";
import DFWUtils from "../script/DFWUtils";
import DatabaseManager from "./DatabaseManager";
import { Request, Response, NextFunction, static as ExpressStatic } from "express";

import * as fs from "fs";
import * as os from "os";
import * as nodejsPath from "path";
import * as UUID from "uuid";
import dfw_user from "../model/dfw_user";

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
    ext?:string;                        // file extensión set manually
    expiration?:Date|moment.Moment|null;// Expiration of a the file in the server (null is never expire)
    access?:number;                     // acces type defined by the access constants in dfw_file model
    description?:string;                // description text for help or alt attributes

    user?:number|dfw_user;
    parent?:dfw_file|FileRecord|number; // file parent for file trees
    variant?:string;                    // file variant to diferenciate from another childs

    copy?:boolean;                      // configuration indicates tha file origin will be copied inted of cuted
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
    children?:FileRecord[];
    variant:string;
}

export type FileRecordOptions = {
    recursive?:boolean;
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

export default class UploadManager implements DFWModule{

    static readonly ACCESS_PUBLIC         = 0; // Everybody can access
    static readonly ACCESS_SESSION        = 1; // Onli loged user can access
    static readonly ACCESS_PRIVATE        = 2; // Onli the owner user and file_access member can access

    private readonly TMPDIR:string;

    private readonly instance:DFWInstance;
    
    constructor(DFW:DFWInstance){

        this.instance = DFW;

        if(DFW.config.upload && DFW.config.upload.tempDir){
            this.TMPDIR = nodejsPath.join(DFW.config.upload.tempDir, UUID.v4());
        }else{
            this.TMPDIR = nodejsPath.join(os.tmpdir(),UUID.v4());
        }
        
        if(fs.existsSync(this.TMPDIR) == false){
            fs.mkdirSync(this.TMPDIR,{recursive:true})
        }
        
        fileMakeTempDir(this.TMPDIR).catch();

        DFW.server.use(this.getStaticUploadPath(),ExpressStatic(this.getLocalUploadDir())) // Public static upload path

        setInterval(()=>{ // Clear expired files each 6 hours
            this.purge();
        },21600000);
    }

    public middleware = (req:Request,res:Response,next:NextFunction)=>{
        req.dfw.upload = {
            validateFileAsync: async (file:number|dfw_file|FileRecord,expire:Date|null = null)=>{
                return await this.validateFileAsync(file,expire);
            },
            invalidateFileAsync: async (file:number|dfw_file|FileRecord)=>{
                return await this.invalidateFileAsync(file);
            },
            flushFileAsync: async (file:UploadedFile|string,config:UploadOptions = {})=>{
                return await this.flushFileAsync(req,file,config);
            },
            getFileRecordAsync: async (file:number|number[]|dfw_file|dfw_file[],options?:FileRecordOptions)=>{
                return await this.getFileRecordDataAsync(file,options);
            },
            assingLocalFileAsync:async (filePath:string,options?:UploadOptions)=>{
                return await this.assingLocalFileAsync(filePath,options);
            },
            assignFileChild: async (localFilePath:string,parent:number|dfw_file|FileRecord,options:UploadOptions = {})=>{
                return this.assignChildLocalFileAsync(localFilePath,parent,options);
            },
            getFileRecord: (file:dfw_file|dfw_file[])=>{
                return this.getFileRecordData(file);
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
    public async flushFileAsync(req:Request,fileReference:UploadedFile|string,config:UploadOptions):Promise<dfw_file>{
        
        let file = (isString(fileReference)?req.files![fileReference]:fileReference) as UploadedFile;
        let currentPath = file.tempFilePath;

        if(file === undefined || file === null){
            throw new Error("File cannot be undefined");
        }

        if(file.truncated === true){
            fileUnlink(file.tempFilePath);
            throw new Error(`maximum file size exceeded (${(file.size/1024).toFixed(0)} Kb)`);
        }
        
        return this.assingLocalFileAsync(currentPath,{...config, name:file.name });
    }


    /**
     * 
     * @param file 
     */
    public async invalidateFileAsync(file:number|dfw_file|FileRecord):Promise<dfw_file>{
        let fileId:number = isNumber(file)?file:file.id;

        let fileObj:dfw_file;

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
        let fileId:number = isNumber(file)?file:file.id;

        let fileObj:dfw_file;

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
        }else if(isNumber(expire)){
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

        let md5 = await md5File(filePath);
        let stats = await fileStat(filePath);
        let mimetype = DFWUtils.getMimetype(options.ext?options.ext:originalBaseName);
        let ext = options.ext?options.ext:DFWUtils.getExtension(originalBaseName);
        let filename = `${DFWUtils.uuid()}.${ext}`;
        let partialPath = moment().format("YYYY/MM");
        let path = options.path?options.path:`${this.getLocalUploadDir()}`;
        let expire = options.expiration?options.expiration:options.expiration === undefined?moment().add(1,"day"):null;
        let finalFilePath = `${path}/${partialPath}/${filename}`;
        let description = options.description?options.description:DFWUtils.getBaseName(originalBaseName);
        let variant = options.variant?options.variant:"";
        let idFileParent = options.parent?isNumber(options.parent)?options.parent:options.parent.id:null;

        if(await fileExistsAsync(`${path}/${partialPath}`) == false){
            await fileMakeDir(`${path}/${partialPath}`,{recursive:true});
        }

        if(options.copy){
            await fileCopy(filePath,finalFilePath).catch((e)=>{
                throw new Error("Process uploaded file async error, unable to copy file uploaded: " + e);
            })
        }else{
            await fileRenameAsync(filePath,finalFilePath).catch((e)=>{
                throw new Error("Process uploaded file async error, unable to move file uploaded: " + e);
            })
        }

        return dfw_file.create({
            slug:options.slug,
            size:stats.size,
            idUser: options.user? isNumber(options.user) ? options.user : options.user.id : undefined,
            name:filename,
            access:UploadManager.ACCESS_PUBLIC,
            checksum:md5,
            description,
            expire,
            mimetype,
            path,
            variant,
            partialPath,
            idFileParent
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
    public async assignChildLocalFileAsync(localFilePath:string,parent:number|dfw_file|FileRecord,options:UploadOptions = {}){
        await this.assingLocalFileAsync(localFilePath,Object.assign(options,{ parent : isNumber(parent)?parent:parent.id }));
    }

    /**
     * @param file 
     */
    public getFileRecordData(file:dfw_file|dfw_file[],options:FileRecordOptions = {}):FileRecord|FileRecord[]{
        if(isArray(file)){
            return file.map((f)=>this.getFileRecordData(f,options) as FileRecord);
        }else{
            return {
                id:file.id,
                url:file.url,
                size:file.size,
                description:file.description,
                variant:file.variant,
                expire:file.expire,
                checksum:file.checksum,
                created:file.created_at,
                children: options.recursive?file.children?file.children.map((cf)=>this.getFileRecordData(cf,options)):[]:[],
            } as FileRecord;
        }
    }

    /**
     * Static method
     * @param DFW 
     * @param file 
     */
    public async getFileRecordDataAsync(file:number|dfw_file|number[]|dfw_file[],options:FileRecordOptions = {}):Promise<FileRecord|FileRecord[]|undefined>{
        if(!file) return;

        if(isArray(file)){
            let res = [] as FileRecord[];
            for(let f of file){
                res.push((await this.getFileRecordDataAsync(f,options)) as any);
            }
            return res;
        }

        if(file instanceof dfw_file){
            return this.getFileRecordData(file,options);
        }else{
            return await this.getFileRecordDataAsync(await this.instance.getModule(DatabaseManager).database.getModel("dfw_file").findByPk(file,{include:[{ association:"children" }]}),options);
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
        if(isBoolean(config)){
            config = {};
        }
        
        return fileUpload(Object.assign({  limits: { fileSize: (5 * 1024 * 1024) } }, config, { useTempFiles : true , tempFileDir : this.TMPDIR }));
    }

    /**
     * 
     * @param file 
     */
    public async removeFileAsync(file:number|dfw_file|FileRecord){
        if(file instanceof dfw_file){
            let path = file.localPath;
            await fileUnlink(path).then(()=>{
                file.destroy();
            }).catch(()=>{ throw `Unable to remvoe file`})
        }else{
            let fo = await dfw_file.findByPk(isNumber(file)?file:file.id);
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
        let data:dfw_file[] = await this.instance.getModule(DatabaseManager).getModel("dfw_file").findAll({ where:{ expire:{ [Op.lt] :moment() }}});
        data.forEach((file)=>{
            fileUnlink(file.path).then(()=>{    // remove file
                file.destroy();                 // remove record db
            });
        });
    }

}

export interface DFWUploadScheme{
    /**
     * Flushes the upload with the file and uploadConfig
     */
    flushFileAsync: (file:UploadedFile|string,config?:UploadOptions)=>Promise<dfw_file|null>

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
    assignFileChild:(path:string,parent:number|dfw_file|FileRecord,options?:UploadOptions)=>Promise<any>
}
