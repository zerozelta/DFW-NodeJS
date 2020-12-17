import { Request, Response, NextFunction } from "express";
import DFWInstance from "../script/DFWInstance";
import { Sequelize } from "sequelize-typescript";
import DFWModule from "../script/DFWModule";
import { Model, BuildOptions } from "sequelize/types";
import path from "path";

const cls = require('cls-hooked');
const namespace = cls.createNamespace('dfw-sequelize-cls');

export type DFWSequelize = Sequelize & {
    getModel : (model:string)=>ModelStatic;
};

export type ModelStatic<M extends Model = Model> = typeof Model & {
    new (values?: object, options?: BuildOptions): M;
};

export type StaticModelType<T = {} > = typeof Model & {
    new (values?: object, options?: BuildOptions):  Model<T> & T
}

export default class DatabaseManager extends DFWModule{

    public readonly database:DFWSequelize;

    constructor(dfw:DFWInstance){
        super(dfw);
        
        let {models,...dbConfig} = dfw.config.database;

        if(dfw.config.useCLS === undefined || dfw.config.useCLS === true){
            (Sequelize as any).__proto__.useCLS(namespace);
        }
        
        this.database = new Sequelize(dbConfig) as DFWSequelize;
        dfw.database = this.database; // link DFW instance with this main database

        if(!models){
            models = [path.join(__dirname, '../model/*') as any];
        }else{
            models.unshift(path.join(__dirname, '../model/*') as any);
        }
        
        this.database.afterDefine("DFWDefineModel",(model)=>{
            if(process.env.NODE_ENV == "development") console.log("[DB_MODEL] " + model.name);
        });

        this.database.addModels(models);
    
        this.database.getModel = (model:string)=>{
            return this.database.models[`${model}`];
        }
    }

    middleware = (req:Request,res:Response,next:NextFunction)=>{
        req.dfw.db = this.database;
        //req.dfw.models = this.database.models;
        next();
    }

    public getModel(name:string){
        return this.database.models[`${name}`];
    }
}
