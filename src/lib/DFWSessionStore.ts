import { Store } from "express-session";
import DFWCore from "./DFWCore";
import { PrismaClient } from "@prisma/client";
import { createLRU } from 'lru.min';

class DFWSessionStore extends Store {

    private db: PrismaClient

    private cache: ReturnType<typeof createLRU>

    constructor(DFW: DFWCore) {
        super()
        this.db = DFW.db
        this.cache = createLRU({ max: DFW.config.session?.sessionCacheSize ?? 300 })
    }

    get(sid: string, callback: (err: any, session?: any) => void): void {
        if (this.cache.has(sid)) {
            if (process.env.NODE_ENV === 'development') console.log(`read session (cache) ${sid}`)
            callback(null, this.cache.get(sid))
            return
        }

        if (process.env.NODE_ENV === 'development') console.log(`read session ${sid}`)

        this.db.dfw_session.findUnique({
            select: { idUser: true },
            where: { id: sid }
        }).then((sessionObj) => {
            if (sessionObj) {
                const passportSession = { cookie: {} as any, passport: { user: sessionObj.idUser } as any }
                this.cache.set(sid, passportSession)
                callback(null, passportSession)
            } else {
                this.cache.set(sid, null)
                callback(null, null)
            }
        }).catch((e) => {
            callback(e)
        })
    }
    set(sid: string, sessionData: any, callback?: (err?: any) => void): void {
        if (process.env.NODE_ENV === 'development') console.log(`setting session ${sid} ${JSON.stringify(sessionData)}`)

        this.cache.set(sid, sessionData)
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
        if (process.env.NODE_ENV === 'development') console.log(`deleting session ${sid}`)

        this.cache.delete(sid)
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