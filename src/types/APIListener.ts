import { RequestHandler } from "express";
import { DFWRequest } from "./DFWRequest";

export type APIMethod = 'get' | 'post' | 'put' | 'delete' | 'options' | 'patch' | 'use'
export type APIListenerFunction = (req: DFWRequest, res: Response) => (Promise<any> | any)

export type APIListener = {
    params?: APIListenerParams
    listener?: APIListenerFunction
}

export type APIListenerParams = {
    /**
     * 
     */
    method?: APIMethod;

    /**
     * if true the listiner will be simple express function without any dfw middleware layers
     */
    raw?: boolean

    /**
     * 
     */
    middleware?: RequestHandler | RequestHandler[];

    /**
     * 
     */
    access?: APIListenerAccess;

    /**
     * Disable the autosend system, allows you to specify what send to the clien and when
     */
    disableAutoSend?: boolean;

    /**
     * Disable body parser (body parser is installed only on post methods)
     */
    disableBodyParser?: boolean;

    /**
     * Callback function after the server responses to the client (after the connection was closed)
     * @param req 
     * @param listenerRes 
     * @returns 
     */
    callback?: (req: DFWRequest, listenerRes: any) => Promise<void>
}

export interface APIListenerAccess {
    session?: boolean;
    validation?: {
        body?: string[];
        query?: string[];
    }
    credentials?: number[] | string[];
    access?: number[] | string[];
}