import { RequestHandler } from "express";
import { APIMethods } from "../module/APIManager";

export interface DFWAPIListenerConfig{
    /**
     * 
     */
    method?:APIMethods;

    /**
     * 
     */
    middleware?:RequestHandler|RequestHandler[];

    /**
     * Indicates tah te session will not be saved nor sended as a cookie to the cliente
     */
    noSession?:true;

    /**
     * 
     */
    security?:ListenerSecurityConfig;

    /**
     * in false Disables the body parse by body-parser
     */
    parseBody?:false;

    /**
     *  allow to upload files 
     */
    upload?:boolean|{};

    /**
     * Disable the autosend system, allows you to specify what send to the clien and when
     */
    disableAutosend?:true;
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