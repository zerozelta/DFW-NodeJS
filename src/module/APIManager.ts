import { NextFunction , Request , Response, RequestHandler, ErrorRequestHandler } from "express";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import DFWModule, { MiddlewareAsyncWrapper } from "../script/DFWModule";
import { DFWAPIListenerConfig } from "../types/DFWAPIListenerConfig";
import { DFWRequestError } from "../types/DFWRequestError";
import bodyParser from "body-parser";
import dfw_credential from "../model/dfw_credential";
import dfw_user from "../model/dfw_user";
 
export type APIFunction = ((req:Request,res:Response,api:DFW.DFWRequestScheme)=>Promise<any>)|((req:Request,res:Response,api:any)=>any);
export type APIMethods = "get"|"put"|"post"|"delete"|"options"|"link"|"GET"|"PUT"|"POST"|"DELETE"|"OPTIONS"|"LINK";

export class APIListenerObject{
    public readonly config:DFWAPIListenerConfig;
    public readonly listener:APIFunction;

    constructor(config:DFWAPIListenerConfig|APIFunction,listener?:APIFunction){
        if(typeof config == "function" && !listener){
            this.listener = config as APIFunction;
            this.config = { method:"get" }
        }else{
            this.config = config as DFWAPIListenerConfig;
            this.listener = listener as APIFunction;
        }
    }
}

export type BootCallback = (req:Request,boot:DFW.Boot)=>Promise<any>;

export default class APIManager extends DFWModule{

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
        let apiLevelMid:(RequestHandler|ErrorRequestHandler)[] = this.generateAPILevelMiddleware(config);

        // APIFunction middleware
        apiLevelMid.push(MiddlewareAsyncWrapper(async (req:Request,res:Response,next:NextFunction)=>{
            await Promise.resolve(apiFunc(req,res,req.dfw)).then((data)=>{
                if(res.finished != true && config.disableAutosend !== true ){
                    this.response(req,res,data);
                    next();
                }
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
    public generateAPILevelMiddleware(config:DFWAPIListenerConfig = {}):RequestHandler[]{
        let levels = [
            async (req:Request,res:Response,next:NextFunction)=>{ req.dfw.__meta.config = config;  next(); }
        ] as RequestHandler[];

        // Body parser
        if(config.parseBody !== false){ // Body parser middleware
            levels.push(bodyParser.json(),bodyParser.urlencoded({ extended:true })); 
        }

        // Upload Middleware
        if(config.upload){
            levels.push(this.instance.FileManager.makeUploadMiddleware(config.upload));
        }
        
        for(let modKey in this.instance){
            let mod = this.instance[modKey];
            if(mod.APILevelMiddleware){
                levels.push(mod.APILevelMiddleware);
            }
        }

        // Adding anothel layer of express middlewares 
        if(config.middleware){
            if(Array.isArray(config.middleware)){
                for(let mid of config.middleware) levels.push(mid);
            }else{
                levels.push(config.middleware);
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
        }else if(Array.isArray(node)){
            for(let e of node){
                this.registerAPIListenerObject(e,path);
            }
        }else if(typeof node == "object"){
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
    
    public async createUserAsync (email:string,nick:string,password:string):Promise<dfw_user>{
        return this.instance.UserManager.createUserAsync(email,nick,password);
    }

    public async findUserAsync(nameOrMail:string,):Promise<dfw_user>{
       return this.instance.UserManager.findUserAsync(nameOrMail);
    }

    public async assingCredentialTo(credential:number|dfw_credential,user:number|dfw_user):Promise<boolean>{
        return this.instance.UserManager.assingCredentialTo(credential,user)
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
