import { PrismaClient } from "@prisma/client";
import { NextFunction } from "express";
import DFWInstance from "../DFWInstance";

export default abstract class DFWModule {

    private _instance: DFWInstance;
    private _db: PrismaClient|Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>;

    constructor(DFW: DFWInstance) {
        this._instance = DFW;
        this._db = this._instance.database;
    }

    get db(){
        return this._db;
    }

    get instance(){
        return this._instance;
    }

    public use(db:PrismaClient|Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>): this {
        this._db = db;
        return this;
        /*
        return new Proxy(this,{
            get: (target, prop, receiver)=>{
                if(prop === "db") return db;
                return target[prop];
            }
        });
        */
    }

    public static middleware?: (req: Request, res: Response, next: NextFunction) => void
}