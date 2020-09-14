import {Express} from "express";
import { SequelizeOptions } from "sequelize-typescript";

export default interface DFWConfig{
    /**
     * 
     */
    server?:Express;

    /**
     * 
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
    }

    /**
     * 
     */
    upload?:busboy.BusboyConfig & { 
        localPrivateUploadDir?:string;      // Path for local private resurces (by defaul its relative to execution directory) example upload -> C:/var/www/resources/upload/private 
        localUploadDir?:string;             // Path for local resurces (by defaul its relative to execution directory) example upload -> C:/var/www/resources/upload/public
        staticUploadPath?:string;           // Path for URL example: /upload -> https://site.com/upload
        tempDir?:string;                    // temp directory for uploaded files, by default is a os.tmpdir 
    };

    useCLS?: boolean;
}