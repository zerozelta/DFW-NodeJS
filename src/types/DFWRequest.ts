import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import type { DFWServiceConstructor, MapServiceConstructors } from "#types/DFWService";

export type DFWRequest<TServices extends readonly DFWServiceConstructor[] = []> = {
    dfw: DFWRequestSchema<TServices>;
} & Request

export type DFWResponse = {
    error: (message: any, status?: number) => void
} & Response

export type DFWRequestSession = {
        isAuthenticated: boolean
        user?: { id: string } | undefined
    }

export type DFWRequestSchema<TServices extends readonly DFWServiceConstructor[] = []> = {
    getSession: () => DFWRequestSession

    db: PrismaClient

    /**
     * Callback called in background after finish the api response
     * @param cb callback function or promise
     * @returns 
     */
    addCallback: (cb: () => void) => void

    [key: string]: any; // Allow dynamic properties
} & MapServiceConstructors<TServices>