import { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from "express";
import DFWInstance from "../script/DFWInstance";

export default abstract class DFWModule {

    public instance:DFWInstance;

    constructor(DFW:DFWInstance){
        this.instance = DFW;
    }

    public abstract middleware:(req:Request,res:Response,next:NextFunction)=>void;
    public APILevelMiddleware?:(req:Request,res:Response,next:NextFunction)=>void;
}

export const MiddlewareAsyncWrapper = (fn:(...args)=>Promise<void>) => (...args) => fn(...args).catch(args[2]);