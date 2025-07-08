import bodyParser from "body-parser";
import DFWCore from "./DFWCore";
import { NextFunction, RequestHandler, Response } from "express";
import { DFWRequest, DFWRequestSchema, DFWResponse } from "../types/DFWRequest";
import DFWUtils from "./DFWUtils";
import chalk from "chalk";
import passport from "passport";
import DFWPassportStrategy from "./strategies/DFWPassportStrategy";
import session from "express-session"
import DFWSessionStore from "./DFWSessionStore";
import { dfw_user } from "@prisma/client";
import fileUpload from "express-fileupload";
import { v7 as uuid7 } from 'uuid';
import { APIListenerParams, ListenerFn } from "./APIListener";

export default class APIManager {
    private DFW: DFWCore

    constructor(DFW: DFWCore) {
        this.DFW = DFW
    }

    public installAPILAyer() {
        const config = this.DFW.config
        const APIRouter = this.DFW.RouterAPILevel

        //// PASSPORT AND SESSION ////
        APIRouter.use(session({
            name: 'stk',
            secret: 'default',
            genid: () => uuid7(),
            resave: false,
            saveUninitialized: false,
            store: new DFWSessionStore(this.DFW),
            cookie: {
                secure: false,
                maxAge: 1000 * 60 * 60 * 24 * 360 //1Y
            }
        }))

        APIRouter.use(passport.initialize())
        APIRouter.use(passport.session())

        if (config.session?.authenticators?.dfw !== false) {
            passport.use('dfw', DFWPassportStrategy)
        }

        passport.serializeUser(async ({ id }: any, done) => {
            done(null, id)
        })

        passport.deserializeUser(async (idUser, done) => {
            done(null, { id: idUser })
        })

        //// DFW SChema ////
        APIRouter.use(((req: DFWRequest, res: DFWResponse, next: NextFunction) => {
            const callbackStack: (() => void)[] = []

            const dfw = {
                db: this.DFW.db,
                getSession: () => ({
                    isAuthenticated: req.isAuthenticated(),
                    user: req.user as dfw_user | undefined
                }),
                addCallback: (cb) => {
                    callbackStack.push(cb)
                }
            }

            req.dfw = dfw
            res.error = (message: any, status: number = 500) => {
                res.status(status)
                throw message
            }
            res.on('finish', () => {
                callbackStack.forEach((cb) => cb())
            })
            next();
        }) as any)
    }

    public installSecurityLayer() {
        // Nothing to do here yet
    }

    public addListener(path: string, params: APIListenerParams = {}, listener?: ListenerFn) {
        const server = this.DFW.server
        const method = params.method ?? 'get'

        if (!listener && !params.middleware) {
            DFWUtils.log(`Unable to set listener for [${method}] ${path} listener and middleware are undefined`)
            return
        }

        if (params.raw) {
            if (params.middleware) server[method](path, params.middleware)
            if (listener) server[method](path, listener as unknown as RequestHandler)

            DFWUtils.log(`${chalk.yellow(method.toUpperCase().padEnd(7, ' '))}  ${chalk.green(path)}`)
            return
        }

        // Body Parser
        if (['post', 'put', 'patch','delete'].includes(method) && params.disableBodyParser !== true) server[method](path, bodyParser.json())

        // DFW middlewares
        server[method](path, this.DFW.RouterAPILevel)
        server[method](path, this.DFW.RouterAccessLevel)

        // file upload middleware
        if (params.upload) server[method](path, fileUpload(typeof params.upload === 'boolean' ? {} : params.upload))

        // plugged middlewares and handlers
        if (params.middleware) server[method](path, params.middleware)

        if (listener) {
            server[method](path, async (req, res, next) => {
                try {
                    // Setting up services
                    params.services?.forEach((Service) => {
                        const serviceInstance = new Service(req.dfw)
                        req.dfw![serviceInstance.namespace] = serviceInstance
                    })

                    // calling the listener
                    const data = await listener(req.dfw as DFWRequestSchema, req as DFWRequest, res as DFWResponse);

                    if (params.callback) {
                        res.on('finish', () => params.callback!(req as DFWRequest, data));
                    }

                    if (!res.finished && !params.disableAutoSend) {
                        if (data) res.json(data).end();
                        else res.end();
                    }

                    next();
                } catch (e) {
                    next(e);
                }
            })
        }

        server.use(path, (err: any, _, res: Response, next) => { // Error handler
            if (process.env.NODE_ENV == "development") DFWUtils.log(err, true);
            const errorStatus = res.statusCode === 200 ? 500 : res.statusCode
            if (typeof err === "object" && err.message) {
                res.status(errorStatus).json({ error: err.message, stack: process.env.NODE_ENV == "development" ? err.stack : null }).end();
            } else {
                res.status(errorStatus).json({ error: err }).end();
            }
        });

        DFWUtils.log(`${chalk.yellow(method.toUpperCase().padEnd(7, ' '))}  ${chalk.green(path)}`)
    }
}