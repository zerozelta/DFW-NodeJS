import { PrismaClient } from "@prisma/client";
import { Express, Router, default as ExpressServer, Handler } from "express";
import { DFWConfig } from "../types/DFWConfig";
import { APIListener, ListenerFn } from "../lib/APIListener";
import chalk from "chalk";
import fs from "fs"
import DFWUtils from "./DFWUtils";
import APIManager from "./APIManager";
import { DFWRequestSchema } from "../types/DFWRequest";
import cors from "cors"
import nodejsPath from "path";

type DFWRegisterItem = APIListener | { [key: string]: DFWRegisterItem } | DFWRegisterItem[]

declare global {
    namespace Express {
        export interface Request {
            dfw: DFWRequestSchema
        }

        export interface Response {
            error: (message: any, status?: number) => void
        }
    }
}

export class DFWCore {

    public static MAIN_INSTANCE: DFWCore

    public static DFW_DIR = "./.dfw"
    public static DFW_UPLOAD_DIR = `${DFWCore.DFW_DIR}/upload`

    public readonly server: Express = ExpressServer();
    public readonly RouterAPILevel: Router = Router();

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

        if (typeof config.prisma === 'function') {
            this.database = config.prisma(this)
        } else {
            this.database = new PrismaClient(config.prisma as any);
        }

        if (fs.existsSync(DFWCore.DFW_DIR) == false) {
            fs.mkdirSync(DFWCore.DFW_DIR);
        }

        if (config.server?.trustProxy) this.server.set('trust proxy', config.server?.trustProxy)

        //// CORS ////
        if (config.server?.cors) {
            this.server.use(cors(config.server.cors))
        }

        this.APIManager.installAPILAyer()

        DFWCore.MAIN_INSTANCE = this
    }

    public start() {
        const port = this.config.server?.port ?? 8080
        this.server.listen(port, () => {
            DFWUtils.log(`Server listening on port ${chalk.yellow(port)}`);
        })
        return this
    }

    public addListener(path: string, listener: APIListener): void;
    public addListener(path: string, fn: ListenerFn): void;
    public addListener(path: string, b: APIListener | ListenerFn): void {
        if (typeof b === 'function') {
            this.APIManager.addListener(path, { fn: b });
        } else {
            this.APIManager.addListener(path, b);
        }
    }

    /**
     * @param DFW
     * @param node
     * @param path
     */
    public register(node: DFWRegisterItem, path: string = "") {
        if (Array.isArray(node)) {
            node.forEach((n) => { this.register(n, path) })
        } else if (!!node.fn || !!node.middleware) {
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

