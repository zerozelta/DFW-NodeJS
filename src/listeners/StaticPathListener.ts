import { APIListener } from "../types/APIListener";
import { static as ExpressStatic, RequestHandler } from "express";

const StaticPathListener: (localPath: string, handlers?: RequestHandler[]) => APIListener = (localPath, handlers) => {
    return {
        params: {
            middleware: [...handlers ?? [], ExpressStatic(localPath, { maxAge: 2592000 })],
            method: 'use'
        }
    }
}

export default StaticPathListener