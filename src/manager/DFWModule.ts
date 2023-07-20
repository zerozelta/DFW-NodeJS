import { PrismaClient } from "@prisma/client";
import * as runtime from '@prisma/client/runtime/library';
import { NextFunction } from "express";
import DFWInstance from "../DFWInstance";

export default abstract class DFWModule {

    private _instance: DFWInstance;
    private _db: Omit<PrismaClient, runtime.ITXClientDenyList>;

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

    public use(db:PrismaClient|Omit<PrismaClient, runtime.ITXClientDenyList>): this {
        this._db = db;
        return this;
    }

    public static middleware?: (req: Request, res: Response, next: NextFunction) => void
}