import { Request, Response } from "express";
import { dfw_user, PrismaClient } from "@prisma/client";
import DFWCore from "../lib/DFWCore";

export type DFWRequest = {
    dfw: DFWRequestSchema;
} & Request

export type DFWResponse = {
} & Response

export type DFWRequestSchema = {
    instance: DFWCore
    isAuthenticated: () => boolean,
    user?: { id: string } & Partial<dfw_user>
    session: {
        login: (user: Partial<dfw_user>) => Promise<void>
        logout: () => Promise<void>
        //getUserAsync: () => Promise<dfw_user | undefined>
        //checkCredentials: () => Promise<boolean>
        //checkAccess: () => Promise<boolean>
    },
    db: PrismaClient;

    /**
     * Callback called in background after finish the api response
     * @param cb callback function or promise
     * @returns 
     */
    addCallback: (cb: () => void) => void
}