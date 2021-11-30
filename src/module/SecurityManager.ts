import { NextFunction , Request , Response } from "express";
import Password from "node-php-password";
import dfw_credential from "../model/dfw_credential";
import dfw_access from "../model/dfw_access";
import DFWModule, { MiddlewareAsyncWrapper } from "../script/DFWModule";
import { DFWAPIListenerConfig, ListenerSecurityConfig } from "../types/DFWAPIListenerConfig";
import { DFWRequestError } from "../types/DFWRequestError";

export type SecurityScheme = {
    hasAccessAsync:(access:string|string[]|number|number[]|dfw_access|dfw_access[])=>Promise<boolean>
    hasCredentialsAsync:(credentials:string|string[]|number|number[]|dfw_credential|dfw_credential[])=>Promise<boolean>
}

export default class SecurityManager extends DFWModule {

    static readonly RULE_LOGGED_SESSION             = 0;
    static readonly RULE_ACCESS                     = 1;
    static readonly RULE_CREDENTIAL                 = 2;
    static readonly RULE_BODY_PARAMS_SETTED         = 3;
    static readonly RULE_QUERY_PARAMS_SETTED        = 4;

    static readonly RULE_LABELS = {
        [SecurityManager.RULE_LOGGED_SESSION] :     "access denied (you need to be logged)",
        [SecurityManager.RULE_ACCESS] :             "access denied (you dond have the access to this)",
        [SecurityManager.RULE_CREDENTIAL] :         "access denied (you dond have the credentials to this)",
        [SecurityManager.RULE_BODY_PARAMS_SETTED] : "missing post arguments setted",
        [SecurityManager.RULE_QUERY_PARAMS_SETTED] :"missing query arguments setted",
    }

    public middleware = (req:Request,res:Response,next:NextFunction)=>{
        req.dfw.security = { 
            hasAccessAsync : (access:string|string[]|number|number[]|dfw_access|dfw_access[])=>{
                return this.checkBindingAsync(req,SecurityManager.RULE_ACCESS,access)
            },
            hasCredentialsAsync : async (credentials:string|string[]|number|number[]|dfw_credential|dfw_credential[])=>{
                return this.checkBindingAsync(req,SecurityManager.RULE_CREDENTIAL,credentials)
            }
        }
        next();
    }

    public APILevelMiddleware = MiddlewareAsyncWrapper( async (req:Request,res:Response,next:NextFunction)=>{
        let config:DFWAPIListenerConfig = req.dfw.__meta.config?req.dfw.__meta.config:{};
        let bindings = config.security ? SecurityManager.jsonToBindings(config.security) : [];

        for(let binding of bindings){
            if(await this.checkBindingAsync(req,binding[0],binding[1]) === false){
                throw new DFWRequestError(DFWRequestError.CODE_API_ACCESS_ERROR,SecurityManager.RULE_LABELS[binding[0]],binding[0]);
            }
        }

        next();
    });

    /**
     * Genera un array de security bindings a partir de un obejto ListenerSecurityConfig
     * @param secConfig 
     */
    public static jsonToBindings(secConfig:ListenerSecurityConfig):[number,any][]{
        let bindings:[number,any][] = [];

        if(secConfig.session !== undefined){
            bindings.push([SecurityManager.RULE_LOGGED_SESSION,secConfig.session?true:false]);
        }

        if(secConfig.credentials){
            bindings.push([SecurityManager.RULE_CREDENTIAL,secConfig.credentials]);
        }

        if(secConfig.access){
            bindings.push([SecurityManager.RULE_ACCESS,secConfig.access]);
        }

        if(secConfig.validation){
            if(secConfig.validation.body){
                bindings.push([SecurityManager.RULE_BODY_PARAMS_SETTED,secConfig.validation.body]);
            }
            if(secConfig.validation.query){
                bindings.push([SecurityManager.RULE_QUERY_PARAMS_SETTED,secConfig.validation.query]);
            }
        }

        if(secConfig.bindings){
            for(let binding of secConfig.bindings){
                bindings.push(binding);
            }
        }

        return bindings;
    };

    public static verifyPassword(encoded:string,test:string):boolean {
        return Password.verify(test,encoded);
    }

    public static encryptPassword(password:string):string {
        return Password.hash(password);
    }

    /**
     * Check all security bindings from a request
     * @param req 
     * @param bindings 
     */
    public async checkBindingArrayAsync(req:Request,bindings:[number,any][]):Promise<boolean>{
        for(let i = 0; i<bindings.length;i++){
            let binding = bindings[i];
            if(await this.checkBindingAsync(req,binding[0],binding[1]) === false){
                return false;
            }
        }

        return true;
    }

    /**
     * 
     * @param req 
     * @param type 
     * @param value 
     */
    public async checkBindingAsync(req:Request,type:number,value:any|any[]):Promise<boolean>{
        switch(type){
            case SecurityManager.RULE_LOGGED_SESSION:{
                return req.dfw.session.isLogged === value;              // checks session state
            }

            case SecurityManager.RULE_CREDENTIAL:{
                return await this.checkUserCredentialAsync(req,value);  // checks credentials array
            }

            case SecurityManager.RULE_ACCESS:{
                return await this.checkUserAccessAsync(req,value);      // checks access array
            }

            case SecurityManager.RULE_BODY_PARAMS_SETTED:{
                return this.checkBodyParams(req,value);                 // Check params array on body
            }

            case SecurityManager.RULE_QUERY_PARAMS_SETTED:{
                return this.checkQueryParams(req,value);                 // Check params array on body
            }

            default:{
                return false; // UNKNOWN RULE always return false
            }
        }
    }

    public async checkUserCredentialAsync(req:Request,credential:dfw_credential|dfw_credential[]|string|string[]){
        if(req.dfw.session.isLogged === false || req.dfw.session.record.user === null) return false;

        return await req.dfw.session.record.user.checkCredentialAsync(credential);
    }

    public async checkUserAccessAsync(req:Request,access:dfw_access|dfw_access[]|string|string[]){
        if(req.dfw.session.isLogged === false || req.dfw.session.record.user === null) return false;
        
        return await req.dfw.session.record.user.checkAccessAsync(access);
    }

    public checkBodyParams(req:Request,params:string[]):boolean{
        let keys = req.body ? Object.keys(req.body) : [];
        return keys.length >= params.length && params.every(v => keys.includes(v))
    }

    public checkQueryParams(req:Request,params:string[]):boolean{
        let keys = req.query ? Object.keys(req.query) : [];
        return keys.length >= params.length && params.every(v => keys.includes(v));
    }
    
}