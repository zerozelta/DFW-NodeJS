import { NextFunction , Request , Response, RequestHandler, ErrorRequestHandler } from "express";
import DFWInstance from "../script/DFWInstance";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import SessionManager from "./SessionManager";
import DFWModule, { MiddlewareAsyncWrapper } from "../script/DFWModule";
import { DFWAPIListenerConfig } from "../types/DFWAPIListenerConfig";
import { DFWRequestError } from "../types/DFWRequestError";
import { isArray, isObject } from "util";
 
export type APIFunction = ((req:Request,res:Response,api:DFW.DFWRequestScheme)=>Promise<any>)|((req:Request,res:Response,api:any)=>any);
export type APIMethods = "get"|"put"|"post"|"delete"|"options"|"link"|"GET"|"PUT"|"POST"|"DELETE"|"OPTIONS"|"LINK";

export class APIListenerObject{
    public readonly config:DFWAPIListenerConfig;
    public readonly listener:APIFunction;

    constructor(config:DFWAPIListenerConfig,listener:APIFunction){
        this.config = config;
        this.listener = listener;
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
        res.json(data).end();
    }

    /**
     * 
     * @param path 
     * @param apiFunc 
     * @param config 
     */
    public addListener(path:string,apiFunc:APIFunction,config:DFWAPIListenerConfig = {}){
        let apiLevelMid:(RequestHandler|ErrorRequestHandler)[] = this.getAPILevelMiddleware(config);

        apiLevelMid.push( MiddlewareAsyncWrapper(async (req:Request,res:Response,next:NextFunction)=>{
            await Promise.resolve(apiFunc(req,res,req.dfw)).then((data)=>{
                this.response(req,res,data);
                next();
            }).catch((err)=>{
                next(new DFWRequestError(DFWRequestError.CODE_API_LEVEL_ERROR,err.message?err.message:err));
            });
        }));

        apiLevelMid.push((err:any,req:Request,res:Response,next:NextFunction)=>{
            if(err){
                if(process.env.NODE_ENV == "development") console.error(err);
                if(err instanceof DFWRequestError){
                    this.response(req,res,req.dfw.api.error(err.message,err.code,err.ref));
                }else{
                    this.response(req,res,req.dfw.api.error(err.message?err.message:err));
                }
            }
            res.end();
        });

        console.log(`[API] ${path}`);
        this.instance.server[config.method?config.method.toLowerCase():"get"](path,apiLevelMid);
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
}