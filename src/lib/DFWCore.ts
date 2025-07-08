import { PrismaClient } from "@prisma/client";
import { Express, Router, default as ExpressServer } from "express";
import { DFWConfig } from "../types/DFWConfig";
import { APIListener, ListenerFn, APIListenerParams } from "../lib/APIListener";
import chalk from "chalk";
import fs from "fs"
import DFWUtils from "./DFWUtils";
import APIManager from "./APIManager";
import { DFWRequest, DFWRequestSchema } from "../types/DFWRequest";
import cors from "cors"
import nodejsPath from "path";

type DFWRegisterItem = APIListener | { [key: string]: DFWRegisterItem } | DFWRegisterItem[]

declare global {
    namespace Express {
        export interface Request {
            dfw?: DFWRequestSchema
        }

        export interface Response {
            error: (message: any, status: number) => void
        }
    }
}

export class DFWCore {

    public static MAIN_INSTANCE: DFWCore

    public static DFW_DIR = "./.dfw"
    public static DFW_UPLOAD_DIR = `${DFWCore.DFW_DIR}/upload`

    public readonly server: Express = ExpressServer();
    public readonly RouterAPILevel: Router = Router();
    public readonly RouterAccessLevel: Router = Router();

    public readonly tmpDir: string

    public readonly config: DFWConfig;
    private database: PrismaClient;

    private APIManager = new APIManager(this)

    constructor(config: DFWConfig) {
        this.config = Object.freeze(config)
        this.tmpDir = config.server?.tmpDir ?? `${DFWCore.DFW_DIR}/temp`

        if (!fs.existsSync(this.tmpDir)) fs.mkdirSync(DFWCore.DFW_DIR);

        if (fs.existsSync(this.tmpDir)) {
            fs.rmSync(this.tmpDir, { recursive: true });
            fs.mkdirSync(this.tmpDir);
        } else {
            fs.mkdirSync(this.tmpDir);
        }

        this.tmpDir = nodejsPath.normalize(fs.mkdtempSync(`${this.tmpDir}${nodejsPath.sep}`));

        this.database = config.server?.prismaGenerathor ?
            config.server.prismaGenerathor(this)
            :
            new PrismaClient(config.prisma as any);

        if (fs.existsSync(DFWCore.DFW_DIR) == false) {
            fs.mkdirSync(DFWCore.DFW_DIR);
        }

        if (config.server?.trustProxy) this.server.set('trust proxy', config.server?.trustProxy)

        //// CORS ////
        if (config.server?.cors) {
            this.server.use(cors(config.server.cors))
        }

        this.APIManager.installAPILAyer()
        this.APIManager.installSecurityLayer()

        DFWCore.MAIN_INSTANCE = this
    }

    public start() {
        const port = this.config.server?.port ?? 8080
        this.server.listen(port, () => {
            DFWUtils.log(`Server listening on port ${chalk.yellow(port)}`);
        })
        return this
    }

    public addListener(path: string, params: APIListenerParams, listener: ListenerFn);
    public addListener(path: string, params: APIListenerParams);
    public addListener(path: string, listener: ListenerFn);
    public addListener(path: string, b: APIListenerParams | ListenerFn, c?: ListenerFn) {
        const params = (typeof b == 'function' ? c : b) as APIListenerParams
        const listener = typeof b === 'function' ? b : c as ListenerFn

        this.APIManager.addListener(path, params, listener)
    }

    public addAccessValidator(path: string, validator: (req: DFWRequest) => boolean | Promise<boolean>) {
        this.RouterAccessLevel.use(path, async (req, res, next) => {
            const isValid = await Promise.resolve(validator(req as DFWRequest))
            if (!isValid) {
                return res.status(403).json({ error: 'ACCESS_DENIED' }).end()
            }
            next()
        })
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
                this.addListener(path, node.params as APIListenerParams, node.listener as ListenerFn)
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

