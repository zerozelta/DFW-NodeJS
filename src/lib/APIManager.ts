import type { NextFunction, Response } from "express";
import type { DFWCore } from "#lib/DFWCore";
import type { DFWRequest, DFWRequestSchema, DFWResponse } from "#types/DFWRequest";
import type { APIListener } from "#types/APIListener";
import chalk from "chalk";
import passport from "passport";
import session from "express-session"
import fileUpload from "express-fileupload";
import { v7 as uuid7 } from 'uuid';
import bodyParser from "body-parser";
import { DFWPassportStrategy } from "#lib/DFWPassportStrategy";
import { DFWSessionStore } from "#lib/DFWSessionStore";
import { DFWUtils } from "#lib/DFWUtils";

export class APIManager<TDFW extends DFWCore<any>> {
    private DFW: TDFW

    constructor(DFW: TDFW) {
        this.DFW = DFW
    }

    public installAPILayer() {
        const config = this.DFW.config
        const APIRouter = this.DFW.routerAPILevel

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
                maxAge: 1000 * 60 * 60 * 24 * 180, //6 Months
                ...config.session?.cookieOptions
            }
        }))

        APIRouter.use(passport.initialize())
        APIRouter.use(passport.session())

        if (config.session?.authenticators?.dfw !== false) {
            passport.use('dfw', DFWPassportStrategy(this.DFW))
        }

        passport.serializeUser(async ({ id }: any, done) => {
            done(null, id)
        })

        passport.deserializeUser(async (idUser, done) => {
            done(null, { id: idUser })
        })

        //// DFW API Schema ////
        APIRouter.use(((req: DFWRequest, res: DFWResponse, next: NextFunction) => {
            const callbackStack: (() => void)[] = []

            const dfw = {
                db: this.DFW.db,
                getSession: () => ({
                    isAuthenticated: req.isAuthenticated(),
                    user: req.user as { id: string } | undefined
                }),

                addCallback: (cb: () => void) => {
                    callbackStack.push(cb)
                }
            }

            req.dfw = dfw
            res.on('finish', () => {
                callbackStack.forEach((cb) => cb())
            })
            next();
        }) as any)
    }

    public addListener(path: string, params: APIListener) {
        const server = this.DFW.server as any
        const method = params.method ?? 'get'
        const fn = params.fn

        if (!params.middleware && !fn) {
            DFWUtils.log(`Unable to set listener for [${method}] ${path} listener and middleware are undefined`)
            return
        }

        // Body Parser
        if (['post', 'put', 'patch', 'delete'].includes(method) && params.disableBodyParser !== true) server[method](path, bodyParser.json())

        // DFW native middleware
        server[method](path, this.DFW.routerAPILevel)

        // file upload middleware
        if (params.upload) server[method](path, fileUpload(typeof params.upload === 'boolean' ? {} : params.upload))

        // plugged middlewares and handlers
        if (params.middleware) {
            const middlewares = Array.isArray(params.middleware) ? params.middleware : [params.middleware];
            server[method](path, ...middlewares);
        }

        if (fn) {
            server[method](path, async (req: DFWRequest, res: DFWResponse, next: NextFunction) => {
                try {
                    // calling the listener
                    const data = await fn(req.dfw as DFWRequestSchema, req as DFWRequest, res as DFWResponse);

                    if (params.callback) {
                        res.on('finish', () => params.callback!(req as DFWRequest, data));
                    }

                    if (!res.finished && !params.disableAutoSend) {
                        if (data) res.json(data).end();
                        else res.end();
                    }
                } catch (e) {
                    next(e);
                }
            })
        }

        server.use(path, (err: any, _1: any, res: Response, _2: NextFunction) => { // Error handler
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