import { Response } from "express";
import DFWInstance from "../DFWInstance";
import { DFWRequest } from "../types/DFWRequestScheme";
import DFWModule from "./DFWModule";
import { DateTime } from "luxon";
import DFWUtils from "../DFWUtils";
import SecurityManager from "./SecurityManager";
import { dfw_session } from "@prisma/client";

const DEFAULT_SESSION_EXPIRE_DAYS = 7;

export default class SessionManager extends DFWModule {

    public readonly sessionExpirationDays: number;
    public readonly stkFieldName: string = "stk";
    public readonly sidFieldName: string = "sid";

    constructor(DFW: DFWInstance) {
        super(DFW);
        this.sessionExpirationDays = DFW.config.session && DFW.config.session.daysToExpire ? DFW.config.session.daysToExpire : DEFAULT_SESSION_EXPIRE_DAYS;
    }

    public middleware = async (req: DFWRequest, res: Response) => {
        req.dfw.session = {
            isLogged: false,
            user: undefined,
            record: undefined as any,
        }

        req.dfw.SessionManager = this;

        if (!req.cookies || !req.cookies.sid || !req.cookies.stk) {
            req.dfw.session = await this.regenerateSessionAsync(req);
        } else {
            let session = await this.db.dfw_session.findFirst({
                where: { id: Number(req.cookies.sid), token: req.cookies.stk },
                include: {
                    user: true
                },
            });
            req.dfw.session = session ? { record: session, user: session.user as any, isLogged: session.user ? true : false } : await this.regenerateSessionAsync(req);
        }

        this.setSessionCookies(req, res);

        res.on("finish", async () => { // callback to touch the session record
            await req.dfw.db.dfw_session.update({
                data: {
                    ip: req.ip,
                    agent: req.headers['user-agent'] ?? "",
                    expire: DateTime.now().plus({ days: this.sessionExpirationDays }).toJSDate()
                },
                where: {
                    id: Number(req.dfw.session.record.id)
                }
            })
        });
    };

    /**
     * 
     * @param req 
     * @param res 
     */
    private async regenerateSessionAsync(req: DFWRequest) {
        let token = DFWUtils.uuid();

        let session: dfw_session = await this.db.dfw_session.create({
            data: {
                token,
                agent: req.headers['user-agent'] ?? "",
                ip: req.ip,
                expire: DateTime.now().plus({ days: this.sessionExpirationDays }).toJSDate()
            }
        });

        return { isLogged: false, record: session, user: undefined }
    }

    /**
     * 
     * @param user 
     * @param password 
     * @param persist undefined => onli browser session time | number => number in days that sessiopn keeps opened
     */
    public async loginAsync(req: DFWRequest, user: string, password: string): Promise<boolean> {
        if (!user || !password) return false;

        // Retrive user with credentials
        let userObj = await req.dfw.UserManager.getUserAsync(user);
        if (userObj) {
            if (SecurityManager.verifyPassword(userObj.encodedKey!, password)) {
                let sessionUpdated = await this.db.dfw_session.update({
                    include: {
                        user: true
                    },
                    where: { id: Number(req.dfw.session.record.id) },
                    data: {
                        idUser: Number(userObj.id),
                        expire: DateTime.now().plus({ days: this.sessionExpirationDays }).toJSDate()
                    }
                });

                req.dfw.session = { isLogged: true, record: sessionUpdated, user: userObj }

                return true;
            }
        }

        await DFWUtils.sleepAsync(2500); // if login attempt fail ocurs a time gap for security to reduce guess oportunities
        return false;
    }

    /**
     * 
     * @param req 
     * @param res 
     */
    public async logoutAsync(req: DFWRequest) {
        let sessionUpdated = await req.dfw.db.dfw_session.update({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        nick: true
                    }
                }
            },
            where: { id: Number(req.dfw.session.record.id) },
            data: {
                idUser: null,
            }
        });

        req.dfw.session = { isLogged: false, record: sessionUpdated }
    }

    /**
     * set (or reset) cookies if needed
     * @param req 
     * @param res 
     */
    public setSessionCookies(req: DFWRequest, res: Response) {
        let cookieOptions = this.instance.config.session ? this.instance.config.session.cookieOptions ?? {} : {};
        let diffCookies = req.cookies.sid != req.dfw.session.record.id || req.cookies.stk != req.dfw.session.record.token;

        if (!diffCookies) return; // no diference in cookies prevent reset cookies

        console.log(cookieOptions);

        res.cookie(this.sidFieldName, req.dfw.session.record.id, cookieOptions);
        res.cookie(this.stkFieldName, req.dfw.session.record.token, cookieOptions);

        req.cookies.sid = req.dfw.session.record.id;
        req.cookies.stk = req.dfw.session.record.token;
    }

    /**
     * Destroy all sessions that expires 1 day ago
     */
    public async sweepExpiredSessionsAsync() {
        await this.db.dfw_session.deleteMany({
            where: {
                expire: {
                    lt: DateTime.now().minus({ days: 1 }).toJSDate()
                }
            }
        });
    }
}