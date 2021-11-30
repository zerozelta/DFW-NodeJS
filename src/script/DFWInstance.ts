import { NextFunction , Express , Response , Request, Router } from "express";
import cookieParser from "cookie-parser";
import DFWConfig from "../types/DFWConfig";
import DatabaseManager, { DFWSequelize } from "../module/DatabaseManager";
import SessionManager from "../module/SessionManager";
import SecurityManager from "../module/SecurityManager";
import APIManager from "../module/APIManager";
import DFWModule from "./DFWModule";
import { Sequelize } from "sequelize/types";
import FileManager from "../module/FileManager";
import express from "express";
import UserManager from "../module/UserManager";
import fs from "fs";

export default class DFWInstance{

    readonly config:DFWConfig;
    readonly server:Express;
    public ROUTER_API_MIDDLEWARE:Router = express.Router();

    public database!:DFWSequelize;

    public readonly DatabaseManager!:DatabaseManager;
    public readonly SessionManager!:SessionManager;
    public readonly SecurityManager!:SecurityManager; 
    public readonly FileManager!:FileManager; 
    public readonly APIManager!:APIManager; 
    public readonly UserManager!:UserManager; 

    constructor(config:DFWConfig, server?:Express){

        // Creating minimum directories
        if(!fs.existsSync("./.dfw")) fs.mkdirSync("./.dfw");

        // start express middleware
        this.server = server ?? express();

        // Setup middleware
        this.ROUTER_API_MIDDLEWARE.use(cookieParser());
        this.ROUTER_API_MIDDLEWARE.use(this.mainMiddleware);        
        
        this.config = config;

        this.setupModule(DatabaseManager);
        this.setupModule(SessionManager);
        this.setupModule(SecurityManager);
        this.setupModule(FileManager);
        this.setupModule(APIManager);
        this.setupModule(UserManager);

    }

    /**
     * 
     */
    public setupModule = (ModClass:{new (dfw:DFWInstance):DFWModule})=>{
        let mod = new ModClass(this);
        let modName = (mod as Object).constructor.name;
        
        this[modName] = mod;
        
        this.ROUTER_API_MIDDLEWARE.use(mod.middleware);

        console.log(`[DFW] setted up module ${modName}`);
    }


    /**
     * retrive a module instance setedup in this DFWInstance with the class or name associated
     * @param mod 
     */
    public getModule<M extends DFWModule>(mod: { new(...args:any): M ;}|string){
        return this[typeof mod == "string" ? mod : mod.name] as M;
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

        req.dfw.instance = this;
         
        next();
    }
}