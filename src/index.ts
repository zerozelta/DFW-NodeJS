import { PrismaClient } from "@prisma/client";
import { Express, Router, default as ExpressServer } from "express";
import { DFWConfig } from "./types/DFWConfig";
import { APIListener, APIListenerFunction, APIListenerParams } from "./types/APIListener";
import chalk from "chalk";
import fs from "fs"
import DFWUtils from "./DFWUtils";
import APIManager from "./lib/APIManager";
import { DFWRequest, DFWRequestSchema } from "./types/DFWRequest";
import expressAsyncHandler from "express-async-handler";
import SessionManager from "./lib/SessionManager";
import passport from "passport";

type DFWRegisterItem = APIListener | { [key: string]: DFWRegisterItem } | DFWRegisterItem[]

declare global {
    namespace Express {
        export interface Request {
            dfw?: DFWRequestSchema
        }
    }
}

export class DFWCore {

    public static MAIN_INSTANCE: DFWCore

    public static DFW_PATH = "./.dfw"

    public readonly server: Express = ExpressServer();
    public readonly RouterAPILevel: Router = Router();
    public readonly RouterAccessLevel: Router = Router();

    public readonly config: DFWConfig;
    private database: PrismaClient;

    private APIManager = new APIManager(this)
    private SessionManager = new SessionManager(this)

    constructor(config: DFWConfig) {
        this.config = Object.freeze(config)
        this.database = new PrismaClient({
            log: config.database ? config.database.log ? ['query', 'info', 'warn', 'error'] : undefined : undefined,
        });

        if (fs.existsSync(DFWCore.DFW_PATH) == false) {
            fs.mkdirSync(DFWCore.DFW_PATH);
        }

        this.APIManager.installPassport()
        this.APIManager.installDFWListenerLayer()
        this.APIManager.installDFWSecurityLayer()

        DFWCore.MAIN_INSTANCE = this
    }

    public start() {
        const port = this.config.server?.port ?? 8080
        this.server.listen(port, () => {
            DFWUtils.log(`Server listening on port ${chalk.yellow(port)}`);
        })
        return this
    }

    public addListener(path: string, params: APIListenerParams, listener: APIListenerFunction);
    public addListener(path: string, params: APIListenerParams);
    public addListener(path: string, listener: APIListenerFunction);
    public addListener(path: string, b: APIListenerParams | APIListenerFunction, c?: APIListenerFunction) {
        const params = (typeof b == 'function' ? c : b) as APIListenerParams
        const listener = typeof b === 'function' ? b : c as APIListenerFunction

        this.APIManager.addListener(path, params, listener)
    }

    public addAccessValidator(path: string, validator: (req: DFWRequest) => boolean | Promise<boolean>) {
        this.RouterAccessLevel.use(path, expressAsyncHandler(async (req, res) => {
            const isValid = await Promise.resolve(validator(req as DFWRequest))
            if (!isValid) {
                res.status(403).json({ error: 'ACCESS_DENIED' }).end()
            }
        }))
    }



    /**
     * @param DFW
     * @param node
     * @param path
     */
    public register(node: DFWRegisterItem | DFWRegisterItem[], path: string = "") {
        if (Array.isArray(node)) {
            node.forEach((n) => { this.register(n, path) })
        } else if (!!node.listener || !!node.params) {
            if (node.listener) {
                this.addListener(path, node.params as APIListenerParams, node.listener as APIListenerFunction)
            } else {
                this.addListener(path, node.params as APIListenerParams)
            }
        } else if (typeof node == "function") {
            this.addListener(path, node)
        } else if (typeof node == "object") {
            for (let okey in node) {
                this.register(node[okey], `${path}/${okey}`)
            }
        } else {
            DFWUtils.log(`Unable to register '${path}' ${typeof node}`, true)
        }
    }

    get db() {
        return this.database
    }
}

export default DFWCore;

