import { NextFunction , Express , Response , Request } from "express";
import cookieParser from "cookie-parser";
import DFWConfig from "../types/DFWConfig";
import DatabaseManager from "../module/DatabaseManager";
import SessionManager from "../module/SessionManager";
import SecurityManager from "../module/SecurityManager";
import { isString } from "util";
import APIManager from "../module/APIManager";
import DFWModule from "./DFWModule";
import { Sequelize } from "sequelize/types";
import UploadManager from "../module/UploadManager";
import express from "express";

export default class DFWInstance{

    readonly config:DFWConfig;
    readonly server:Express;

    public modules:DFWModule[] = [];

    public database!:Sequelize;

    constructor(config:DFWConfig, server:Express = express()){

        // let router = express.Router();

        // Setup middleware
        //server.use(cookieParser());
        //server.use(bodyParser.json()); 
        //server.use(bodyParser.urlencoded({ extended:true }));
        server.use(this.mainMiddleware);        
        
        this.server = server;
        this.config = config;

        this.setupModule(new DatabaseManager(this));
        this.setupModule(new SessionManager(this));
        this.setupModule(new SecurityManager(this));
        this.setupModule(new UploadManager(this));
        this.setupModule(new APIManager(this));
    }

    /**
     * 
     */
    public setupModule = (mod:DFWModule)=>{
        let modName = (mod as Object).constructor.name;
        
        this.modules[modName] = mod;
        
        this.server.use(mod.middleware);

        console.log(`[DFW] setted up module ${modName}`);
    }

    /**
     * retrive a module instance setedup in this DFWInstance with the class or name associated
     * @param mod 
     */
    public getModule<M extends DFWModule>(mod: { new(...args:any): M ;}|string){
        return this.modules[isString(mod) ? mod : mod.name] as M;
    } 

    /**
     * Initialize dfw namespace and schemes
     */
    public mainMiddleware = (req:Request, res:Response, next:NextFunction) => {
        
        req.dfw = {
            __meta:{
                instance: this
            }
        } as any;
        
        next();
    }
}