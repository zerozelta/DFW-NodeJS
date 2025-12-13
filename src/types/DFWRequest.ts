import type { Request, Response } from "express";

export type DFWRequest<TDatabase = any> = {
    dfw: DFWRequestSchema<TDatabase>;
} & Request

export type DFWResponse = Response

export type DFWRequestSession = {
    isAuthenticated: boolean
    user?: { id: string } | undefined
}

export type DFWRequestSchema<TDatabase = any> = {
    getSession: () => DFWRequestSession

    db: TDatabase

    /**
     * Callback called in background after finish the api response
     * @param cb callback function or promise
     * @returns 
     */
    addCallback: (cb: () => void) => void

    [key: string]: any; // Allow dynamic properties
}