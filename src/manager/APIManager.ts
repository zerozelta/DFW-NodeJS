import { NextFunction, Response, Express, Router } from "express";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";
import { DFWRequest, DFWRequestScheme } from "../types/DFWRequestScheme";
import DFWModule from "./DFWModule";
import { APIListenerConfig } from "../types/APIListenerConfig";
import DFWBoot from "../types/DFWBoot";
import DFWInstance from "../DFWInstance";
import express from "express";
import cookieParser from "cookie-parser";

export type APIFunction = (req: DFWRequest, res: Response, dfw: DFWRequestScheme) => (Promise<any> | any)
export type APIMethods = "get" | "put" | "post" | "delete" | "options" | "link";

export class APIListenerObject {
    public readonly config: APIListenerConfig;
    public readonly listener: APIFunction;

    constructor(config: APIListenerConfig | APIFunction, listener?: APIFunction) {
        if (typeof config == "function" && !listener) {
            this.listener = config as APIFunction;
            this.config = { method: "get" }
        } else {
            this.config = config as APIListenerConfig;
            this.listener = listener as APIFunction;
        }
    }
}

export type BootCallback = (req: DFWRequest, boot: DFWBoot) => Promise<any>;

export default class APIManager extends DFWModule {

    public server?: Express;

    public API_ROUTER: Router = express.Router();

    private bootCallbacks: BootCallback[] = [

        /** add default callback on each APIManager instance */
        async ({ dfw }: DFWRequest, boot: DFWBoot) => {
            boot.session = {
                user: dfw.session.user ? {
                    id: dfw.session.user.id,
                    nick: dfw.session.user.nick,
                    email: dfw.session.user.email,
                } : undefined,
                credentials: [],
                access: [],
            }

            if (dfw.session.isLogged && dfw.session.user) {
                let credentials = await dfw.db.dfw_credential.findMany({
                    select: { id: true, name: true },
                    where: {
                        users: {
                            every: {
                                idUser: dfw.session.user.id
                            }
                        }
                    }
                })

                let access = await dfw.db.dfw_access.findMany({
                    select: { id: true, name: true },
                    where: {
                        credentials: {
                            every: {
                                idCredential: {
                                    in: credentials.map((c) => (c.id))
                                }
                            }
                        }
                    }
                });

                boot.session.credentials = credentials;
                boot.session.access = access;
            }
        }
    ];

    constructor(DFW: DFWInstance) {
        super(DFW);
    }

    public async middleware(req: DFWRequest, res: Response) {
        req.dfw.boot = () => this.getBootAsync(req);
    }

    public startServer(port = 3000, server: Express = require("express")()) {
        this.API_ROUTER.use(cookieParser());

        server.listen(port);
        this.server = server;

        console.log(`[DFW] Server listening on port ${port}`);
    }

    /**
     * 
     * @param path 
     * @param apiFunction 
     * @param config 
    */
    public addListener(path: string, apiFunction: APIFunction, config: APIListenerConfig = {}) {

        if (!this.server) throw `you must start an DFW/Express Server before add a listener`;

        let handlers = this.makeRequestHandlers(config);

        // APIFunction middleware
        handlers.push(MiddlewareAsyncWrapper(async (req: DFWRequest, res: Response, next: NextFunction) => {
            await Promise.resolve(apiFunction(req, res, req.dfw)).then((data) => {
                if (res.finished !== true && config.autoSend !== false) res.json(data).end();
                if (config.callback) res.on("finish", () => config.callback && config.callback(req, data));
                next();
            }).catch((err) => next(err));
        }));

        handlers.push(((err: any, req: Request, res: Response, next: NextFunction) => {
            if (process.env.NODE_ENV == "development") console.error(`[DFW_API_ERROR] ${err}`);
            res.statusCode = 500;

            if (err instanceof TypeError) {
                res.json({ error: err.message, stack: process.env.NODE_ENV == "development" ? err.stack : null }).end();
            } else {
                res.json({ error: err }).end();
            }

            next(err);
        }) as any);

        this.server.use(path, this.API_ROUTER);
        this.server[config.method ? config.method.toLowerCase() : "get"](path, handlers);

        console.log(`[API][${config.method ? config.method.toUpperCase() : "GET"}] ${path}`);
    }

    makeRequestHandlers(config: APIListenerConfig = {}) {
        let handlers: any[] = [
            (req: DFWRequest, res: Response, next: NextFunction) => {
                req.dfw = {
                    __meta: {
                        config,
                    },
                    innstance: this.instance,
                } as any;
                next();
            }
        ];

        // Body parser
        if (config.parseBody !== false) { // Body parser middleware
            handlers.push(bodyParser.json(), bodyParser.urlencoded({ extended: true }));
        }

        if (config.upload) {
            fileUpload(Object.assign(config.upload, config, { useTempFiles: true, tempFileDir: this.instance.FileManager.tmpDir }));
        }

        handlers.push(MiddlewareAsyncWrapper(async (req: DFWRequest, res: Response, next: NextFunction) => {
            try {

                await this.instance.DatabaseManager.middleware(req, res);
                await this.instance.SessionManager.middleware(req, res);
                await this.instance.SecurityManager.middleware(req, res);
                await this.instance.UserManager.middleware(req, res);
                await this.instance.FileManager.middleware(req, res);
                await this.instance.APIManager.middleware(req, res);

                next();
            } catch (e) {
                next(e);
            }
        }));

        return handlers;
    }

    /**
     * 
     * @param dfw 
    */
    public async getBootAsync(req: DFWRequest): Promise<DFWBoot> {
        let result = {} as DFWBoot;

        for (let callback of this.bootCallbacks) {
            await callback(req, result);
        }

        return result;
    }

    /**
     *
     * @param callback 
     */
    public addBootCallback(callback: BootCallback) {
        this.bootCallbacks.push(callback);
    }

    /**
     * Función recursiva que registra en DFW los listeners basados en una estructura de objeto
     * @param listener 
     * @param path 
    */
    public addListenerObject(listener: (APIListenerObject | Object) | (APIListenerObject | Object)[], path: string) {
        if (listener instanceof APIListenerObject) {
            this.addListener(path, listener.listener, listener.config);
        } else if (Array.isArray(listener)) {
            for (let e of listener) {
                this.addListenerObject(e, path);
            }
        } else if (typeof listener == "object") {
            let keys = Object.keys(listener);
            for (let key of keys) {
                let n = listener[key];
                this.addListenerObject(n, `${path}/${key}`);
            }
        } else {
            throw "PhaseLoadModule:registerApiListener expected object|array|APIListener as node argument";
        }
    }

}

export const MiddlewareAsyncWrapper = (fn: (...args) => Promise<void>) => (...args) => fn(...args).catch(args[2]);