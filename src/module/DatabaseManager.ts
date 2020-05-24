import { Request, Response, NextFunction } from "express";
import path from "path";
import DFWInstance from "../script/DFWInstance";
import { Sequelize } from "sequelize-typescript";
import DFWModule from "../script/DFWModule";

declare global{
    namespace DFW {
        interface DFWRequestScheme{
            db:Sequelize;
        }
    }
}

export default class DatabaseManager implements DFWModule{

    public readonly database:Sequelize;

    constructor(dfw:DFWInstance){
        if(!dfw.config.database.models){
            dfw.config.database.models = [ path.join(__dirname, '../model/*') as any ];
        }else{
            dfw.config.database.models.unshift(path.join(__dirname, '../model/*') as any);
        }
        this.database = new Sequelize(dfw.config.database);
        console.log({models:Object.keys(this.database.models)});
    }

    middleware = async (req:Request,res:Response,next:NextFunction)=>{
        req.dfw.db = this.database;
        next();
    }
     

}