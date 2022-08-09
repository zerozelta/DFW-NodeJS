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
import SecurityManager from "./SecurityManager";

export type APIFunction = (req: DFWRequest, res: Response, dfw: DFWRequestScheme) => (Promise<any> | any)
export type APIMethods = "get" | "put" | "post" | "delete" | "options" | "link";

export class APIListener {
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

    public DFW_BASIC_ROUTER: Router = express.Router();

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

        this.DFW_BASIC_ROUTER.use(cookieParser());

        this.DFW_BASIC_ROUTER.use(((req: DFWRequest, res: Response, next: NextFunction) => {
            req.dfw = {
                __meta: {},
                instance: this.instance,
                req,
                res
            } as any;
            next();
        }) as any);

        this.DFW_BASIC_ROUTER.use(MiddlewareAsyncWrapper(async (req: DFWRequest, res: Response, next: NextFunction) => {
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

    }

    public async middleware(req: DFWRequest, res: Response) {
        req.dfw.boot = () => this.getBootAsync(req);
    }

    public startServer(port = 3000, server: Express = require("express")()) {
        this.server = server;
        this.server.listen(port);
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

        let handlers = this.makeAPIListenerMiddlewares(config);

        // APIFunction middleware
        handlers.push(MiddlewareAsyncWrapper(async (req: DFWRequest, res: Response, next: NextFunction) => {
            await Promise.resolve(apiFunction(req, res, req.dfw)).then((data) => {
                if (res.finished !== true && config.autoSend !== false) res.json(data).end();
                if (config.callback) res.on("finish", () => config.callback && config.callback(req, data));
                next();
            }).catch((err) => next(err));
        }));

        // error handler middleware
        handlers.push(((err: any, req: Request, res: Response, next: NextFunction) => {
            if (process.env.NODE_ENV == "development") console.error(`[DFW_ERROR] ${err}`);
            res.statusCode = 500;

            if (typeof err === "object" && err.message) {
                res.json({ error: err.message, stack: process.env.NODE_ENV == "development" ? err.stack : null }).end();
            } else {
                res.json({ error: err }).end();
            }

            next(err);
        }) as any);

        this.server.use(path, this.DFW_BASIC_ROUTER); // Install basic middleware
        this.server[config.method ? config.method.toLowerCase() : "get"](path, handlers);

        console.log(`[API][${config.method ? config.method.toUpperCase() : "GET"}] ${path}`);
    }

    makeAPIListenerMiddlewares(config: APIListenerConfig = {}) {
        let handlers: any[] = [];

        //Check security middleware
        if (config.security) {
            handlers.push(
                MiddlewareAsyncWrapper(async (req: DFWRequest, res: Response, next: NextFunction) => {
                    let bindings = config.security ? SecurityManager.jsonToBindings(config.security) : [];
                    for (let binding of bindings) {
                        console.log(binding);
                        if (await req.dfw.SecurityManager.checkBindingAsync(req, binding[0], binding[1]) === false) {
                            next(`${SecurityManager.RULE_LABELS[binding[0]]}`);
                        }
                    }
                    next();
                })
            )
        }

        // Body parser
        if (config.parseBody !== false) { // Body parser middleware
            handlers.push(bodyParser.json(), bodyParser.urlencoded({ extended: true }));
        }

        // Upload handler
        if (config.upload) {
            handlers.push(fileUpload(Object.assign(config.upload, config, { useTempFiles: true, tempFileDir: this.instance.FileManager.tmpDir })));
        }

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
    public addListenerObject(listener: (APIListener | Object) | (APIListener | Object)[], path: string) {
        if (listener instanceof APIListener) {
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