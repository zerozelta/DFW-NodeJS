import { Request, Response, NextFunction } from "express";
import path from "path";
import DFWInstance from "../script/DFWInstance";
import { Sequelize } from "sequelize-typescript";
import DFWModule from "../script/DFWModule";
import { Model, BuildOptions } from "sequelize/types";
import dfw_user from "../model/dfw_user";

export type DFWSequelize = Sequelize & {
    getModel : (model:string)=>ModelStatic;
};

export type ModelStatic<M extends Model = Model> = typeof Model & {
    new (values?: object, options?: BuildOptions): M;
};

export type StaticModelType<T = {} > = typeof Model & {
    new (values?: object, options?: BuildOptions):  Model<T> & T
}

type ModelBasic<M> = Partial< SubType< Omit<M,keyof Model>,string|number|Model|Model[]|Date > >;

type FilterFlags<Base, Condition> = {
    [Key in keyof Base]: 
        Base[Key] extends Condition ? Key : never
};
type AllowedNames<Base, Condition> = 
        FilterFlags<Base, Condition>[keyof Base];
type SubType<Base, Condition> = 
        Pick<Base, AllowedNames<Base, Condition>>;

export default class DatabaseManager implements DFWModule{

    public readonly database:DFWSequelize;

    constructor(dfw:DFWInstance){
        let {models,...dbConfig} = dfw.config.database
        
        this.database = new Sequelize(dbConfig) as any;
        //this.database.definedModels = {};

        if(!models){
            models = [path.join(__dirname, '../model/*') as any];
        }else{
            models.unshift(path.join(__dirname, '../model/*') as any);
        }
        
        this.database.afterDefine("DFWDefineModel",(model)=>{
            if(process.env.NODE_ENV == "development") console.log("[DB_MODEL] "+ model.name);
            //this.database.definedModels[`${model.name}`] = model as any;
        });

        this.database.addModels(models);
    
        this.database.getModel = (model:string)=>{
            return this.database.models[`${model}`];
        }

        //console.log({models:Object.keys(this.database.models)});
    }

    middleware = (req:Request,res:Response,next:NextFunction)=>{
        req.dfw.db = this.database;
        req.dfw.models = this.database.models;
        next();
    }

    public getModel(name:string){
        return this.database.models[`${name}`];
    }
}
