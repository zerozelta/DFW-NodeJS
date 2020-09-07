import DFWInstance from "./script/DFWInstance";
import {Express} from "express";
import { DFWAPIListenerConfig } from "./types/DFWAPIListenerConfig";
import DFWConfig from "./types/DFWConfig";
import dfw_session from "./model/dfw_session";
import { APIResponseScheme, APIListenerObject } from "./module/APIManager";
import { DFWSequelize, StaticModelType } from "./module/DatabaseManager";
import { DFWUploadScheme } from "./module/UploadManager";
import { SecurityScheme } from "./module/SecurityManager";



export default class DFW{

    private static  instances = {};

    public static createInstance(name:string,config:DFWConfig,server?:Express):DFWInstance{
        DFW.instances[`${name}`] = new DFWInstance(config,server);
        return DFW.instances[`${name}`];
    }

    public static getInstance(name?:string):DFWInstance{
        if(!name) return this.instances[Object.keys(this.instances)[0]];
        return DFW.instances[`${name}`];
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

declare global {
    namespace Express {
        interface Request {
            dfw: DFW.DFWRequestScheme;
        }
    }
}

declare global {
    export namespace DFW {
        export interface Boot{
            session:{
                isLogged:boolean,
                nick?:string,
                email?:string,
                credentials:{
                    id:number,
                    name:string,
                }[],
                access?:{
                    id:number,
                    name:string,
                }[]
            }
        }

        export interface DFWRequestScheme{
            __meta:{
                instance:DFWInstance,
                config?:DFWAPIListenerConfig,
            },
            session:{
                id:number;
                token:string;
                isLogged:boolean;
                record:dfw_session;
                loginAsync : (username:string,password:string,keepopen?:number)=>Promise<boolean>;
                logoutAsync : ()=>Promise<boolean>;
            },
            security:SecurityScheme;
            api:APIResponseScheme;
            db:DFWSequelize;
            models:{[key:string]:StaticModelType};
            upload:DFWUploadScheme;
        }
    }
}