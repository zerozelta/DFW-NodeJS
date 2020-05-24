import DFWInstance from "./script/DFWInstance";
import {Express} from "express";
import { DFWAPIListenerConfig } from "./types/DFWAPIListenerConfig";
import DFWConfig from "./types/DFWConfig";

export default class DFW{

    private static  instances = [];

    public static createInstance(name:string,config:DFWConfig,server?:Express):DFWInstance{
        DFW.instances[`${name}`] = new DFWInstance(config,server);
        return DFW.instances[`${name}`];
    }

    public static getInstance(name:string){
        return DFW.instances[`${name}`];
    }

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

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
            meta:{
                instance:DFWInstance,
                config?:DFWAPIListenerConfig,
            },
        }
        
        export interface DFWResponseScheme{
        }
    }
}