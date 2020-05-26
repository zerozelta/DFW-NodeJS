import { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from "express";
import DFWInstance from "../script/DFWInstance";

export default interface DFWModule {
    middleware:(req:Request,res:Response,next:NextFunction)=>void;
    APILevelMiddleware?:(req:Request,res:Response,next:NextFunction)=>void;
}

export const MiddlewareAsyncWrapper = (fn:(...args)=>Promise<void>) => (...args) => fn(...args).catch(args[2]);

export declare var DFWModule: {
    new (DFW:DFWInstance): DFWModule;
}