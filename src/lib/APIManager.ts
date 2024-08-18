import bodyParser from "body-parser";
import DFWCore from "..";
import { NextFunction, RequestHandler } from "express";
import { DFWRequest, DFWRequestSchema } from "../types/DFWRequest";
import { APIListenerParams, APIListenerFunction } from "../types/APIListener";
import DFWUtils from "../DFWUtils";
import expressAsyncHandler from "express-async-handler";
import chalk from "chalk";
import cors from 'cors';
import passport from "passport";
import DFWPassportStrategy from "./strategies/DFWPassportStrategy";
import session from "express-session"
import DFWSessionStore from "./DFWSessionStore";
import { dfw_user } from "@prisma/client";

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
            genid: () => DFWUtils.uuid(),
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

        //// CORS ////
        if (this.DFW.config.server?.cors) {
            APIRouter.use(cors(this.DFW.config.server?.cors))
        }

        //// DFW SChema ////
        APIRouter.use(((req: DFWRequest, _: Response, next: NextFunction) => {
            const dfw: Partial<DFWRequestSchema> = {
                instance: this.DFW,
                db: this.DFW.db,
                isAuthenticated: () => req.isAuthenticated(),
                user: req.user as dfw_user,
                addCallback: (cb) => { }
            }
            req.dfw = dfw as DFWRequestSchema
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
            return
        }

        // Body Parser
        if (['post', 'put', 'patch'].includes(method) && params.disableBodyParser !== true) server[method](path, bodyParser.json())

        // DFW middlewares
        server[method](path, this.DFW.RouterAPILevel)
        server[method](path, this.DFW.RouterAccessLevel)

        // Param middlewares
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
            next(err);
        })

        DFWUtils.log(`${chalk.yellow(method.toUpperCase().padEnd(7, ' '))}  ${chalk.green(path)}`)
    }
}