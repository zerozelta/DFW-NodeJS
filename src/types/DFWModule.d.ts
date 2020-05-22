import { Request, Response, NextFunction, RequestHandler } from "express";
import DFWInstance from "../script/DFWInstance"


export default interface DFWModule {
    middleware:RequestHandler;
    APILevelMiddleware?:RequestHandler;
}

export declare var DFWModule: {
    new (DFW:DFWInstance): DFWModule;
}