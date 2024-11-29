import bodyParser from "body-parser";
import DFWCore from "../DFWCore";
import { NextFunction, RequestHandler, Response } from "express";
import { DFWRequest, DFWRequestSchema } from "../types/DFWRequest";
import { APIListenerParams, APIListenerFunction } from "../types/APIListener";
import DFWUtils from "../DFWUtils";
import chalk from "chalk";
import passport from "passport";
import DFWPassportStrategy from "./strategies/DFWPassportStrategy";
import session from "express-session"
import DFWSessionStore from "./DFWSessionStore";
import { dfw_user } from "@prisma/client";
import fileUpload from "express-fileupload";
import { v7 as uuid7 } from 'uuid';

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
        APIRouter.use(((req: DFWRequest, res: Response, next: NextFunction) => {
            const callbackStack: (() => void)[] = []

            const dfw: Partial<DFWRequestSchema> = {
                instance: this.DFW,
                db: this.DFW.db,
                isAuthenticated: () => req.isAuthenticated(),
                user: req.user as dfw_user,
                session: {
                    login: async (user) => new Promise<void>((resolve, reject) => {
                        req.login(user, (err) => {
                            if (err) return reject(err)
                            req.session['passport'] = { user: user.id }
                            req.dfw.user = user as any
                            resolve()
                        })
                    }),
                    logout: () => new Promise<void>((resolve, reject) => {
                        req.logout((err) => {
                            if (err) return reject(err)
                            req.session['passport'] = { user: undefined }
                            req.dfw.user = undefined
                            resolve()
                        })
                    })
                },
                addCallback: (cb) => {
                    callbackStack.push(cb)
                }
            }
            req.dfw = dfw as DFWRequestSchema
            res.on('finish', () => {
                callbackStack.forEach((cb) => cb())
            })
            next();
        }) as any)
    }

    public installSecurityLayer() {
        // Nothing to do here yet
    }

    public addListener(path: string, params: APIListenerParams = {}, listener?: APIListenerFunction) {
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
        if (['post', 'put', 'patch'].includes(method) && params.disableBodyParser !== true) server[method](path, bodyParser.json())

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
                    await Promise.resolve(listener(req as DFWRequest, res as any)).then((data) => {
                        if (res.finished !== true && params.disableAutoSend !== true) res.json(data).end();
                        if (params.callback) res.on("finish", () => params.callback && params.callback(req as DFWRequest, data));
                        next();
                    })
                } catch (e) {
                    next(e)
                }
            })
        }

        server.use(path, (err: any, _, res, next) => { // Error handler
            if (process.env.NODE_ENV == "development") DFWUtils.log(err, true);
            if (typeof err === "object" && err.message) {
                res.status(500).json({ error: err.message, stack: process.env.NODE_ENV == "development" ? err.stack : null }).end();
            } else {
                res.status(500).json({ error: err }).end();
            }
        })

        DFWUtils.log(`${chalk.yellow(method.toUpperCase().padEnd(7, ' '))}  ${chalk.green(path)}`)
    }
}