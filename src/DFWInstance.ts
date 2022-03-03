import APIManager from "./manager/APIManager";
import DatabaseManager from "./manager/DatabaseManager";
import FileManager from "./manager/FileManager";
import SecurityManager from "./manager/SecurityManager";
import SessionManager from "./manager/SessionManager";
import UserManager from "./manager/UserManager";
import { DFWConfig } from "./types/DFWConfig";
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";

class DFWInstance {

    readonly config: DFWConfig;
    readonly database: PrismaClient;

    DatabaseManager: DatabaseManager;
    APIManager: APIManager;
    SessionManager: SessionManager;
    SecurityManager: SecurityManager;
    UserManager: UserManager;
    FileManager: FileManager;

    constructor(config: DFWConfig) {
        this.config = config;

        this.database = new PrismaClient({
            //log: process.env.NODE_ENV == "development" ? ['query', 'info', 'warn', 'error'] : undefined,
        });

        if (fs.existsSync(".dfw") == false) {
            fs.mkdirSync(".dfw");
        }

        this.DatabaseManager = new DatabaseManager(this);
        this.APIManager = new APIManager(this);
        this.SessionManager = new SessionManager(this);
        this.SecurityManager = new SecurityManager(this);
        this.UserManager = new UserManager(this);
        this.FileManager = new FileManager(this);

        Object.freeze(this.config); // Make it readonly
    }

}

export default DFWInstance;