import { PrismaClient } from "@prisma/client";
import { NextFunction } from "express";
import DFWInstance from "../DFWInstance";

export default abstract class DFWModule {

    public instance: DFWInstance;
    public db: PrismaClient;

    constructor(DFW: DFWInstance) {
        this.instance = DFW;
        this.db = this.instance.database;
    }

    public use(db:PrismaClient|Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>): this {
        return new Proxy(this,{
            get: (target, prop, receiver)=>{
                if(prop === "db") return db;
                return target[prop];
            }
        });
    }

    public static middleware?: (req: Request, res: Response, next: NextFunction) => void
}