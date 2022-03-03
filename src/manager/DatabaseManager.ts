import { Response} from "express";
import DFWInstance from "../DFWInstance";
import { DFWRequest } from "../types/DFWRequestScheme";
import DFWModule from "./DFWModule";
import { Prisma, PrismaClient, dfw_access } from '@prisma/client'

export default class DatabaseManager extends DFWModule{

    constructor(DFW:DFWInstance){
        super(DFW);
        let { config } = DFW;

    }

    middleware = async (req:DFWRequest,res:Response)=>{
        req.dfw.db = this.instance.database; //Extends sequelize database object to dfw var (quick access)
    }

}