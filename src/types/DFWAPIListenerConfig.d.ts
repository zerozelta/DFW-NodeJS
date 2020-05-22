import { RequestHandler } from "express";
import { APIMethods } from "../module/APIManager";

export default interface DFWAPIListenerConfig{
    method?:APIMethods;
    middleware?:RequestHandler;
    security?:ListenerSecurityConfig;
    upload?:boolean|{

    }
}


export interface ListenerSecurityConfig {
    session?:boolean;
    validation?:{
        body?:string[];
        query?:string[];
    }
    bindings?:[number,any][];
    credentials?:number[]|string[];
    access?:number[]|string[];
}