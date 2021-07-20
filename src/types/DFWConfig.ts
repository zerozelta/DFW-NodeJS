import {CookieOptions, Express} from "express";
import { SequelizeOptions } from "sequelize-typescript";

export default interface DFWConfig{
    /**
     * Custom server
     */
    server?:Express;

    /**
     * Database initialization config
     */
    database:SequelizeOptions;

    /**
     * TODO
     */
    session?:{
        /**
         * Session token name space in cookie
         */
        stk?:string;

        /**
         * Session id name space in cookie
         */
        sid?:string;

        /**
         * Default days to expire on non persistent sessions (onli on database record)
         */
        daysToExpire?:number;

        /**
         * Default days to expire on persistent sessions
         */
        daysToExpireOnPersistent?:number;

        /**
         * Set all sessions always persistent (logged or not logged)
         */
        forcePersistent?:boolean;

        /**
         * Cookie options (for sessions)
         */
        cookieOptions?:CookieOptions;
    }

    /**
     * 
     */
    upload?:{ 
        localPrivateUploadDir?:string;      // Path for local private resurces (by defaul its relative to execution directory) example upload -> C:/var/www/resources/upload/private 
        localUploadDir?:string;             // Path for local resurces (by defaul its relative to execution directory) example upload -> C:/var/www/resources/upload/public
        staticUploadPath?:string;           // Path for URL example: /upload -> https://site.com/upload
        tempDir?:string;                    // temp directory for uploaded files, by default is a os.tmpdir 

        headers?: any;
        highWaterMark?: number;
        fileHwm?: number;
        defCharset?: string;
        preservePath?: boolean;
        limits?: {
            fieldNameSize?: number;
            fieldSize?: number;
            fields?: number;
            fileSize?: number;
            files?: number;
            parts?: number;
            headerPairs?: number;
        };
    };

    useCLS?: boolean; // by default true
}