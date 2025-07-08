import { Request, Response } from "express";
import { dfw_user, PrismaClient } from "@prisma/client";
import { DFWServiceConstructor, MapServiceConstructors } from "../lib/DFWService";

export type DFWRequest<TServices extends readonly DFWServiceConstructor[] = []> = {
    dfw: DFWRequestSchema<TServices>;
} & Request

export type DFWResponse = {
    error: (message: any, status?: number) => void
} & Response

export type DFWRequestSchema<TServices extends readonly DFWServiceConstructor[] = []> = {
    getSession: () => {
        isAuthenticated: boolean
        user?: { id: string } | undefined
    }

    db: PrismaClient

    /**
     * Callback called in background after finish the api response
     * @param cb callback function or promise
     * @returns 
     */
    addCallback: (cb: () => void) => void
} & MapServiceConstructors<TServices>