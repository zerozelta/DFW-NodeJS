import { Store } from "express-session";
import DFWCore from "..";
import { PrismaClient } from "@prisma/client";

class DFWSessionStore extends Store {

    private db: PrismaClient

    constructor(DFW: DFWCore) {
        super()
        this.db = DFW.db
    }

    get(sid: string, callback: (err: any, session?: any) => void): void {
        //console.log(`read session ${sid}`)
        this.db.dfw_session.findUnique({
            select: { idUser: true },
            where: { id: sid }
        }).then((sessionObj) => {
            if (sessionObj) {
                callback(null, { cookie: {} as any, passport: { user: sessionObj?.idUser } as any })
            } else {
                callback(null, null)
            }
        }).catch((e) => {
            callback(e)
        })
    }
    set(sid: string, sessionData: any, callback?: (err?: any) => void): void {
        //console.log(`setting session ${sid} ${JSON.stringify(sessionData)}`)
        this.db.dfw_session.upsert({
            create: {
                id: sid,
                idUser: sessionData.passport?.user,
            },
            update: {
                idUser: sessionData.passport?.user,
            },
            where: {
                id: sid
            }
        }).then(() => {
            callback?.()
        })
    }
    destroy(sid: string, callback?: (err?: any) => void): void {
        //console.log(`deleting session ${sid}`)
        this.db.dfw_session.deleteMany({
            where: {
                id: sid
            },
        }).then(() => {
            callback?.()
        }).catch((e) => {
            callback?.(e)
        })
    }
}

export default DFWSessionStore