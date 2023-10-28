import DFWInstance from "../DFWInstance";
import { Request, Response } from "express";
import SecurityManager from "../manager/SecurityManager";
import UserManager from "../manager/UserManager";
import SessionManager from "../manager/SessionManager";
import FileManager from "../manager/FileManager";
import DFWBoot from "./DFWBoot";
import { dfw_session, dfw_user, PrismaClient } from "@prisma/client";
import { APIListenerConfig } from "./APIListenerConfig";

export type DFWRequest = {
    dfw: DFWRequestScheme;
} & Request

export type DFWRequestScheme = {
    __meta: {
        config: APIListenerConfig       // retrives the API configuration
    },
    req:DFWRequest
    res:Response
    instance: DFWInstance
    session: {
        isLogged: boolean
        user?: dfw_user
        record: dfw_session & { user?: dfw_user | null }
    },

    db: PrismaClient;

    boot: () => Promise<DFWBoot>

    //manager
    SecurityManager: SecurityManager
    SessionManager: SessionManager
    FileManager: FileManager
    UserManager: UserManager
}

