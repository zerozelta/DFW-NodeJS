import type { DFWResponse } from "#types/DFWRequest";
import type { APIListener, DFWRegisterItem, ListenerFn } from "#types/APIListener";
import type { DFWConfig } from "#types/DFWConfig";
import type { Express } from "express"
import { Router, default as ExpressServer } from "express";
import { DFWUtils } from "#lib/DFWUtils";
import { APIManager } from "#lib/APIManager";
import { makeService as makeServiceHelper, type ServiceCtor, type ServiceInstance } from "#makers/makeService";
import { makeListener } from "#makers/makeListener";
import { makeGuard } from "#makers/makeGuard";
import { makeRepository as makeRepositoryHelper, type RepositoryCtor, type RepositoryInstance } from "#makers/makeRepository";
import cors from "cors"
import chalk from "chalk";
import fs from "fs"
import nodejsPath from "path";

export class DFWCore<TDatabase = any> {
    public static DFW_DIR = "./.dfw"
    public static DFW_UPLOAD_DIR = `${DFWCore.DFW_DIR}/upload`

    public readonly server: Express = ExpressServer();
    public readonly routerAPILevel: Router = Router();

    public readonly tmpDir: string

    public readonly config: DFWConfig;

    private database: any;

    private APIManager = new APIManager(this)

    constructor(db: TDatabase, config: DFWConfig) {
        this.database = db;
        this.config = Object.freeze(config)
        this.tmpDir = config?.tmpDir ?? `${DFWCore.DFW_DIR}/temp`

        if (!fs.existsSync(this.tmpDir)) fs.mkdirSync(DFWCore.DFW_DIR);

        if (fs.existsSync(this.tmpDir)) {
            fs.rmSync(this.tmpDir, { recursive: true });
            fs.mkdirSync(this.tmpDir);
        } else {
            fs.mkdirSync(this.tmpDir);
        }

        this.tmpDir = nodejsPath.normalize(fs.mkdtempSync(`${this.tmpDir}${nodejsPath.sep}`));

        if (fs.existsSync(DFWCore.DFW_DIR) == false) {
            fs.mkdirSync(DFWCore.DFW_DIR);
        }

        if (config?.trustProxy) this.server.set('trust proxy', config?.trustProxy)

        //// CORS ////
        if (config?.cors) {
            this.server.use(cors(config.cors))
        }

        this.APIManager.installAPILayer()
    }

    public start(): Promise<this> {
        const port = this.config?.port ?? 8080;
        return new Promise((resolve, reject) => {
            const srv = this.server.listen(port, () => {
                DFWUtils.log(`Server listening on port ${chalk.yellow(port)}`);
                resolve(this);
            });
            srv.on?.('error', (err: any) => reject(err));
        });
    }

    public addListener(path: string, listener: APIListener<TDatabase>): void;
    public addListener(path: string, fn: ListenerFn<TDatabase>): void;
    public addListener(path: string, b: APIListener<TDatabase> | ListenerFn<TDatabase>): void {
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
                this.register((node as any)[okey], `${path}/${okey}`)
            }
        } else {
            DFWUtils.log(`Unable to register '${path}' ${typeof node}`, true)
        }
    }

    get db() {
        return this.database as TDatabase
    }

    makeListener = makeListener
    makeGuard = makeGuard<TDatabase>

    makeService = <TDeps extends object, M extends object>(
        deps: TDeps,
        methods: M & ThisType<ServiceInstance<TDatabase, TDeps, M>>
    ): ServiceCtor<TDatabase, TDeps, M> => {
        return makeServiceHelper<TDatabase, TDeps, M>(this, deps, methods);
    }

    makeRepository = <M extends object>(
        methods: M & ThisType<RepositoryInstance<M, TDatabase>>
    ): RepositoryCtor<M, TDatabase> => {
        return makeRepositoryHelper<TDatabase, M>(this, methods);
    }

    public listener = {
        get: makeListener<TDatabase>({ method: 'get' }),
        post: makeListener<TDatabase>({ method: 'post' }),
        put: makeListener<TDatabase>({ method: 'put' }),
        delete: makeListener<TDatabase>({ method: 'delete' }),
        patch: makeListener<TDatabase>({ method: 'patch' }),
    }
}
