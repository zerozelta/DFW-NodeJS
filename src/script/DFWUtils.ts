import uuidv4 from "uuid/v4";
import { lookup } from "mime-types";
import path from "path";

export default class DFWUtils{

    public static readonly EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    public static isEmail(email:string):boolean {
        return this.EMAIL_REGEX.test(String(email).toLowerCase());        
    }

    /**
     * 
     * @param duration ms of sleeping
     */
    public static async sleepAsync(duration:number):Promise<void> {
        await new Promise(function(resolve) {
          setTimeout(()=> { resolve(0) }, duration);
        })
    }

    /**
     * 
     * @param path 
     */
    public static getMimetype(path:string):string|false{
        return lookup(path);  
    }

    /**
     * retrive file extension 
     * @param filePath 
     */
    public static getExtension(filePath:string):string{
        return path.extname(filePath).substr(1);
    }

    public static getBaseName(filePath:string){
        path.basename(filePath)
    }

    /**
     * 
     */
    public static randomHexString(len:number){
        let maxlen = 8,
            min = Math.pow(16,Math.min(len,maxlen)-1),
            max = Math.pow(16,Math.min(len,maxlen)) - 1,
            n   = Math.floor( Math.random() * (max-min+1) ) + min,
            r   = n.toString(16);
        while ( r.length < len ) {
           r = r + DFWUtils.randomHexString( len - maxlen );
        }
        return r;
    };

    /**
     * 
     */
    public static uuid(){
        return uuidv4();
    }
}