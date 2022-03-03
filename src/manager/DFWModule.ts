import { PrismaClient } from "@prisma/client";
import { NextFunction } from "express";
import DFWInstance from "../DFWInstance";

export default abstract class DFWModule {

    public instance: DFWInstance;
    public db:PrismaClient;

    constructor(DFW: DFWInstance) {
        this.instance = DFW;
        this.db = this.instance.database;
    }

    public static middleware?: (req: Request, res: Response, next: NextFunction) => void
}