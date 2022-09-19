import { RequestHandler } from "express";
import fileUpload from "express-fileupload";
import { APIMethods } from "../manager/APIManager";
import { DFWRequest } from "./DFWRequestScheme";

export type APIListenerConfig = {
    /**
     * 
     */
     method?:APIMethods;

     /**
      * 
      */
     middleware?:RequestHandler|RequestHandler[];
 
     /**
      * 
      */
     security?:ListenerSecurityConfig;
 
     /**
      * By default DFW-Express parses the request body
      * if parseBody is false Disables the body parse
      * 
      */
     parseBody?:boolean;
 
     /**
      *  allow/disallow to upload files 
      *  @default false
      */
     upload?:true|fileUpload.Options;
 
     /**
      * Disable the autosend system, allows you to specify what send to the clien and when
      */
     autoSend?:boolean;

     /**
      * if false the session system will be disabled for this api endpoint
      * @default true
      */
      noSession?:boolean;

     /**
      * Callback function after the server responses to the client (after the connection was closed)
      */
     callback?:(req:DFWRequest,objResponse:any)=>Promise<void>
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