import { NextFunction , Request , Response, RequestHandler, ErrorRequestHandler } from "express";
import DFWInstance from "../script/DFWInstance";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import DFWModule, { MiddlewareAsyncWrapper } from "../script/DFWModule";
import { DFWAPIListenerConfig } from "../types/DFWAPIListenerConfig";
import { DFWRequestError } from "../types/DFWRequestError";
import { isArray, isObject, isFunction } from "util";
import dfw_user from "../model/dfw_user";
import dfw_credential from "../model/dfw_credential";
import dfw_access from "../model/dfw_access";
import { Transaction } from "sequelize/types";
import SecurityManager from "./SecurityManager";
import DFWUtils from "../script/DFWUtils";
import UploadManager from "./UploadManager";
import bodyParser from "body-parser";
 
export type APIFunction = ((req:Request,res:Response,api:DFW.DFWRequestScheme)=>Promise<any>)|((req:Request,res:Response,api:any)=>any);
export type APIMethods = "get"|"put"|"post"|"delete"|"options"|"link"|"GET"|"PUT"|"POST"|"DELETE"|"OPTIONS"|"LINK";

export class APIListenerObject{
    public readonly config:DFWAPIListenerConfig;
    public readonly listener:APIFunction;

    constructor(config:DFWAPIListenerConfig|APIFunction,listener?:APIFunction){
        if(isFunction(config) && !listener){
            this.listener = config as APIFunction;
            this.config = { method:"get" }
        }else{
            this.config = config as DFWAPIListenerConfig;
            this.listener = listener as APIFunction;
        }
    }
}

export type BootCallback = (req:Request,boot:DFW.Boot)=>Promise<any>;

export default class APIManager implements DFWModule{

    private instance:DFWInstance;

    private bootCallbacks:BootCallback[] = [

        /** add default callback on each APIManager instance */
       async ({dfw}:Request,boot:DFW.Boot)=>{
           boot.session = {
                isLogged: dfw.session.isLogged,
                nick: dfw.session.isLogged?dfw.session.record.user!.nick:undefined,
                email:dfw.session.isLogged?dfw.session.record.user!.email:undefined,
                credentials:[],
                access:[]
            }

           if(dfw.session.isLogged && dfw.session.record.user){ // if is user logged, then we load the access and credentials and send it to boot state
                if(!dfw.session.record.user.credentials){ 
                    dfw.session.record.user.credentials = await dfw.session.record.user.$get("credentials",{include:[{ association:"access"}]});
                }
                dfw.session.record.user.credentials.forEach((c)=>{
                   let {name,id} = c; 
                   boot.session.credentials.push({name,id});

                   if(c.access !== undefined){
                        c.access.forEach((a)=>{
                           let {name,id} = a; 
                           boot.session.credentials.push({name,id});
                        })
                    }
                })
            }
        }
   ];

    constructor(DFW:DFWInstance){
        this.instance = DFW;
    }

    public middleware = (req:Request,res:Response,next:NextFunction)=>{
        req.dfw.api = {
            getBootAsync : async ()=>{
                return await this.getBootAsync(req);
            },
            error : (message:string = "error",code?:number,ref?:any)=>{
                res.status(400);
                res.statusMessage = "ERROR";
                return { message , code, ref };
            },
            success : (data?:any)=>{
                res.status(200);
                return data?data:"";
            },
            response : (data:any)=>{
                return this.response(req,res,data); 
            },
            notFound : (description?:string)=>{
                res.status(404);
                return { message : description };
            },
        }

        next();
    }


    /**
     * 
     * @param req 
     * @param res 
     * @param data 
     */
    public response(req:Request,res:Response,data = {}){
        if(!res.finished){
            res.json(data).end();
        }
    }

    /**
     * 
     * @param path 
     * @param apiFunc 
     * @param config 
     */
    public addListener(path:string,apiFunc:APIFunction,config:DFWAPIListenerConfig = {}){
        let apiLevelMid:(RequestHandler|ErrorRequestHandler)[] = this.getAPILevelMiddleware(config);

        // Upload Middleware
        if(config.upload){
            apiLevelMid.push(this.instance.getModule(UploadManager).makeUploadMiddleware(config.upload));
        }

        // Adding anothel layer of express middlewares 
        if(config.middleware){
            if(isArray(config.middleware)){
                for(let mid of config.middleware) apiLevelMid.push(mid);
            }else{
                apiLevelMid.push(config.middleware);
            }
        }
        

        // APIFunction middleware
        apiLevelMid.push( MiddlewareAsyncWrapper(async (req:Request,res:Response,next:NextFunction)=>{
            await Promise.resolve(apiFunc(req,res,req.dfw)).then((data)=>{
                this.response(req,res,data);
                next();
            }).catch((err)=>{
                console.error(err);
                next(new DFWRequestError(DFWRequestError.CODE_API_LEVEL_ERROR,err.message?err.message:err));
            });
        }));

        // Error catcher
        apiLevelMid.push((err:any,req:Request,res:Response,next:NextFunction)=>{
            if(err){
                if(process.env.NODE_ENV == "development") { console.error(err) };
                if(err instanceof DFWRequestError){
                    this.response(req,res,req.dfw.api.error(err.message,err.code,err.ref));
                }else{
                    this.response(req,res,req.dfw.api.error(err.message?err.message:err));
                }
            }
            res.end();
        });

        
        this.instance.server.use(path,this.instance.ROUTER_API_MIDDLEWARE);
        this.instance.server[config.method?config.method.toLowerCase():"get"](path,apiLevelMid);
        
        console.log(`[API][${config.method?config.method.toUpperCase():"GET"}] ${path}`);
    }

    /**
     * 
     * @param apiFunc 
     * @param config 
     */
    public getAPILevelMiddleware(config:DFWAPIListenerConfig = {}):RequestHandler[]{
        let levels = [
            async (req:Request,res:Response,next:NextFunction)=>{ req.dfw.__meta.config = config;  next(); }
        ] as RequestHandler[];

        if(config.parseBody !== false){ // Body parser middleware
            levels.push(bodyParser.json(),bodyParser.urlencoded({ extended:true })); 
        }
        
        for(let modKey in this.instance.modules){
            let mod = this.instance.modules[modKey];
            if(mod.APILevelMiddleware){
                levels.push(mod.APILevelMiddleware);
            }
        }

        return levels;
    }

    /**
     * 
     * @param dfw 
     */
    public async getBootAsync(req:Request):Promise<DFW.Boot>{
        let result = {} as DFW.Boot;

        for(let i = 0; i < this.bootCallbacks.length; i++){
            await this.bootCallbacks[i](req,result);
        }

        return result;
    }

    /**
     * 
     * @param bootc 
     */
    public addBootCallback(bootc:BootCallback){
        this.bootCallbacks.push(bootc);
    }

    /**
     * fetch data to the server
     * @param path 
     * @param config 
     */
    public static fetch(path:string,config?:AxiosRequestConfig):Promise<AxiosResponse>{
        return axios(path,config);
    }

    /**
     * Función recursiva que registra en DFW los listeners basados en una estructura de objeto
     * @param node 
     * @param path 
     */
    public registerAPIListenerObject(node:(APIListenerObject|Object)|(APIListenerObject|Object)[],path:string){  
        if(node instanceof APIListenerObject){
            this.addListener(path,node.listener,node.config);
        }else if(isArray(node)){
            for(let e of node){
                this.registerAPIListenerObject(e,path);
            }
        }else if(isObject(node)){
            let keys = Object.keys(node);
            for( let key of keys){
                let n = node[key];
                this.registerAPIListenerObject(n,`${path}/${key}`);
            }
        }else{
            throw "PhaseLoadModule:registerApiListener expected object|array|APIListener as node argument";
        }
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    public async createUserAsync (email:string,nick:string,password:string,transaction?:Transaction):Promise<dfw_user>{
        return this.instance.database.models.dfw_user.create({
            nick,
            email,
            encodedKey:SecurityManager.encryptPassword(password)
        },{ transaction });
    }

    public async findUserAsync(nameOrMail:string,transaction?:Transaction):Promise<dfw_user>{
        if(DFWUtils.isEmail(nameOrMail)){
            return this.instance.database.models.dfw_user.findOne({where: { email: nameOrMail } , transaction });
        }else{
            return this.instance.database.models.dfw_user.findOne({where: { nick: nameOrMail } });
        }
    }

    public async createCredentiaASync(name:string,description?:string,transaction?:Transaction):Promise<dfw_credential>{
        return this.instance.database.models.dfw_credential.create({ name , description },{transaction});
    }

    public async createAccessAsync(name:string,description?:string,transaction?:Transaction):Promise<dfw_access>{
        return this.instance.database.models.dfw_access.create({ name , description },{transaction});
    }

    public async assingCredentialTo(credential:number|dfw_credential,user:number|dfw_user,transaction?:Transaction):Promise<boolean>{
        if(user instanceof dfw_user){
            return user.assignCredentialAsync(credential,transaction);
        }else{
            let userObj = await this.instance.database.models.dfw_user.findByPk(user);
            return this.assingCredentialTo(credential,userObj,transaction)
        }
    }

    public async assingAccessTo(access:number|dfw_access,credential:number|dfw_credential,transaction?:Transaction):Promise<boolean>{
        throw `Function APIMager assingAccessTo not implemented yet`
    }
}



export type APIResponseScheme = {
    /**
     * 
     */
    getBootAsync: () => Promise<DFW.Boot>;
    
    /**
     * 
     */
    error: (description?:string,code?:number,ref?:any) => any;

    /**
     * 
     */
    success: (data?:any)=>any;

    /**
     * 
     */
    response: (data:any)=>void;

    /**
     * 
     */
    notFound: (description?:string)=>void;
}
