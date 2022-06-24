import DFWInstance from "../DFWInstance";
import { Request } from "express";
import SecurityManager from "../manager/SecurityManager";
import UserManager from "../manager/UserManager";
import SessionManager from "../manager/SessionManager";
import FileManager from "../manager/FileManager";
import DFWBoot from "./DFWBoot";
import { dfw_session, dfw_user, PrismaClient } from "@prisma/client";

export type DFWRequest = {
    dfw: DFWRequestScheme;
} & Request

export type DFWRequestScheme = {
    __meta: {
        noSession: boolean // indicates session will not be saved in the database neither send session cookie to the client
    },
    req:DFWRequest
    res:Response
    instance: DFWInstance
    session: {
        isLogged: boolean
        user?: dfw_user
        record: dfw_session & { user?: { id: number, nick: any, email: any } | null }
    },

    db: PrismaClient;

    boot: () => Promise<DFWBoot>

    //manager
    SecurityManager: SecurityManager
    SessionManager: SessionManager
    FileManager: FileManager
    UserManager: UserManager
}

