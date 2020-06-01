import { NextFunction , Request , Response } from "express";
import Password from "node-php-password";
import DFWInstance from "../script/DFWInstance";
import dfw_credential from "../model/dfw_credential";
import dfw_access from "../model/dfw_access";
import DFWModule, { MiddlewareAsyncWrapper } from "../script/DFWModule";
import { DFWAPIListenerConfig } from "../types/DFWAPIListenerConfig";
import { DFWRequestError } from "../types/DFWRequestError";

export default class SecurityManager implements DFWModule {

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

    constructor(DFW:DFWInstance){

    }

    public middleware = (req:Request,res:Response,next:NextFunction)=>{
        next();
    }

    public APILevelMiddleware = MiddlewareAsyncWrapper( async (req:Request,res:Response,next:NextFunction)=>{
        let config:DFWAPIListenerConfig = req.dfw.__meta.config?req.dfw.__meta.config:{};
        let bindings:[number,any][] = [];

        if(config.security?.session !== undefined){
            bindings.push([SecurityManager.RULE_LOGGED_SESSION,config.security.session?true:false]);
        }

        if(config.security?.credentials){
            bindings.push([SecurityManager.RULE_CREDENTIAL,config.security.credentials]);
        }

        if(config.security?.access){
            bindings.push([SecurityManager.RULE_ACCESS,config.security.access]);
        }

        if(config.security?.bindings){
            for(let binding of config.security.bindings){
                bindings.push(binding);
            }
        }
        

        for(let binding of bindings){
            if(await this.checkBindingAsync(req,binding[0],binding[1]) === false){
                throw new DFWRequestError(DFWRequestError.CODE_API_ACCESS_ERROR,SecurityManager.RULE_LABELS[binding[0]],binding[0]);
            }
        }

        next();
    });

    public static verifyPassword(encoded:string,test:string):boolean {
        return Password.verify(test,encoded);
    }

    public static encryptPassword(password:string):string {
        return Password.hash(password);
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
        let keys = Object.keys(req.body);

        return keys.length >= params.length && params.every(v => keys.includes(v))
    }

    public checkQueryParams(req:Request,params:string[]):boolean{
        let keys = Object.keys(req.query);

        return keys.length >= params.length && params.every(v => keys.includes(v));
    }
    
}