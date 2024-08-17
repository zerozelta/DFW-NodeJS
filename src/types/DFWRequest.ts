import { Request } from "express";
import { dfw_user, PrismaClient } from "@prisma/client";
import DFWCore from "..";

export type DFWRequest = {
    dfw: DFWRequestSchema;
} & Request

export type DFWRequestSchema = {
    instance: DFWCore
    session: {
        getUserAsync: () => Promise<dfw_user | undefined>
        checkCredentials: () => Promise<boolean>
        checkAccess: () => Promise<boolean>
    },
    db: PrismaClient;

    /**
     * Callback called in background after finish the api response
     * @param cb callback function or promise
     * @returns 
     */
    addCallback: (cb: () => void | Promise<void>) => void
}