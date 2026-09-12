import type { NextFunction, Response } from "express";
import type { DFWCore } from "#lib/DFWCore";
import type {
    DFWRequest,
    DFWRequestSchema,
    DFWResponse
} from "#types/DFWRequest";
import type { APIListener } from "#types/APIListener";
import chalk from "chalk";
import passport from "passport";
import session from "express-session";
import fileUpload from "express-fileupload";
import { v7 as uuid7 } from "uuid";
import bodyParser from "body-parser";
import { DFWPassportStrategy } from "#lib/DFWPassportStrategy";
import { DFWSessionStore } from "#lib/DFWSessionStore";
import { DFWUtils } from "#lib/DFWUtils";

export class APIManager<TDFW extends DFWCore<any>> {
    private DFW: TDFW;

    constructor(DFW: TDFW) {
        this.DFW = DFW;
    }

    public installAPILayer() {
        const config = this.DFW.config;
        const APIRouter = this.DFW.routerAPILayer;

        //// PASSPORT AND SESSION ////

        if (
            process.env.NODE_ENV === "production" &&
            !config.session?.secret
        ) {
            DFWUtils.log(
                "[DFW] Warning: using the default session secret in production"
            );
        }

        APIRouter.use(
            session({
                rolling: config.session?.rolling ?? false,
                name: "stk",
                secret: config.session?.secret ?? "default",
                genid: () => uuid7(),
                resave: false,
                saveUninitialized: false,
                store: new DFWSessionStore(this.DFW),
                cookie: {
                    secure: false,
                    maxAge: 1000 * 60 * 60 * 24 * 180, // 6 months
                    ...config.session?.cookieOptions
                }
            })
        );

        APIRouter.use(passport.initialize());
        APIRouter.use(passport.session());

        if (config.session?.authenticators?.dfw !== false) {
            passport.use("dfw", DFWPassportStrategy(this.DFW));
        }

        passport.serializeUser(({ id }: any, done) => {
            done(null, id);
        });

        passport.deserializeUser((idUser, done) => {
            done(null, { id: idUser });
        });

        //// DFW API Schema ////

        APIRouter.use(
            ((
                req: DFWRequest,
                res: DFWResponse,
                next: NextFunction
            ) => {
                const callbackStack: (() => void | Promise<void>)[] = [];
                let responseFinished = false;

                const runCallback = (
                    callback: () => void | Promise<void>
                ) => {
                    void Promise.resolve()
                        .then(callback)
                        .catch((error) => {
                            console.error(
                                "[DFW] Callback error:",
                                error
                            );
                        });
                };

                const dfw = {
                    db: this.DFW.db,

                    getSession: () => ({
                        isAuthenticated: req.isAuthenticated(),
                        user: (req.user as any)?.id,
                        id: req.sessionID
                    }),

                    addCallback: (
                        callback: () => void | Promise<void>
                    ) => {
                        // Run immediately if the response already finished.
                        if (responseFinished) {
                            runCallback(callback);
                            return;
                        }

                        callbackStack.push(callback);
                    }
                };

                req.dfw = dfw;

                // All post-response callbacks are handled in one place.
                res.once("finish", () => {
                    responseFinished = true;

                    for (const callback of callbackStack.splice(0)) {
                        runCallback(callback);
                    }
                });

                next();
            }) as any
        );

        APIRouter.use(this.DFW.routerAPIContainer);

        //// ERROR HANDLER ////

        APIRouter.use(
            (
                err: any,
                _req: any,
                res: Response,
                next: NextFunction
            ) => {
                // Let Express handle errors after the response has started.
                if (res.headersSent) {
                    return next(err);
                }

                if (process.env.NODE_ENV === "development") {
                    DFWUtils.log(err, true);
                }

                const explicitStatus =
                    typeof err?.status === "number"
                        ? err.status
                        : typeof err?.statusCode === "number"
                          ? err.statusCode
                          : undefined;

                const currentStatus =
                    res.statusCode >= 400 &&
                    res.statusCode <= 599
                        ? res.statusCode
                        : undefined;

                const errorStatus =
                    explicitStatus >= 400 &&
                    explicitStatus <= 599
                        ? explicitStatus
                        : currentStatus ?? 500;

                if (
                    typeof err === "object" &&
                    err !== null &&
                    err.message
                ) {
                    res.status(errorStatus).json({
                        error: err.message,
                        stack:
                            process.env.NODE_ENV === "development"
                                ? err.stack
                                : null
                    });

                    return;
                }

                res.status(errorStatus).json({
                    error: err
                });
            }
        );
    }

    public addListener(path: string, params: APIListener) {
        const APIContainer = this.DFW.routerAPIContainer as any;
        const method = params.method ?? "get";
        const mainFunction = params.fn;

        if (!params.middleware && !mainFunction) {
            DFWUtils.log(
                `Unable to set listener for [${method}] ${path} listener and middleware are undefined`
            );
            return;
        }

        // Install the API layer only for registered API routes.
        this.DFW.server[method](
            path,
            this.DFW.routerAPILayer
        );

        // Body parser
        if (
            ["post", "put", "patch", "delete"].includes(method) &&
            params.disableBodyParser !== true
        ) {
            APIContainer[method](
                path,
                bodyParser.json()
            );
        }

        // File upload middleware
        if (params.upload) {
            APIContainer[method](
                path,
                fileUpload(
                    typeof params.upload === "boolean"
                        ? {}
                        : params.upload
                )
            );
        }

        // Plugged middlewares and handlers
        if (params.middleware) {
            const middlewares = Array.isArray(params.middleware)
                ? params.middleware
                : [params.middleware];

            APIContainer[method](
                path,
                ...middlewares
            );
        }

        if (mainFunction) {
            APIContainer[method](
                path,
                async (
                    req: DFWRequest,
                    res: DFWResponse,
                    next: NextFunction
                ) => {
                    try {
                        const data = await mainFunction(
                            req.dfw as DFWRequestSchema,
                            req,
                            res
                        );

                        if (params.callback) {
                            req.dfw.addCallback(() =>
                                params.callback!(req, data)
                            );
                        }

                        if (
                            !params.disableAutoSend &&
                            !res.writableEnded
                        ) {
                            /*
                             * If the handler already started the response,
                             * only finish it instead of trying to replace it.
                             */
                            if (res.headersSent) {
                                res.end();
                                return;
                            }

                            if (data !== undefined) {
                                res.json(data);
                            } else {
                                res.end();
                            }
                        }
                    } catch (error) {
                        next(error);
                    }
                }
            );
        }

        DFWUtils.log(
            `${chalk.yellow(
                method.toUpperCase().padEnd(7, " ")
            )}  ${chalk.green(path)}`
        );
    }
}