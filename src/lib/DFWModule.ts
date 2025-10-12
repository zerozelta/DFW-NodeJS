import type { PrismaClient } from "@prisma/client"
import type * as runtime from "@prisma/client/runtime/library"
import { DFWCore } from "#lib/DFWCore"

type Constructor<T = any> = new (...args: any[]) => T;

export type ExtractRepositories<T extends Constructor[]> = {
    [K in T[number]as K extends { namespace: string }
    ? K['namespace']
    : never]: InstanceType<K>;
};

export class DFWModule {
    private _db: PrismaClient = DFWCore.MAIN_INSTANCE.db

    get db() {
        return this._db
    }

    get DFW() {
        return DFWCore.MAIN_INSTANCE
    }

    constructor(db?: PrismaClient | Omit<PrismaClient, runtime.ITXClientDenyList>) {
        if (db) {
            this.use(db)
        }
    }

    /**
     *
     * @param db
     * @returns
     */
    public use = (
        db: PrismaClient | Omit<PrismaClient, runtime.ITXClientDenyList>
    ): this => {
        this._db = db as PrismaClient
        return this
    }

    public transaction = async (
        cb: (
            tx: PrismaClient | Omit<PrismaClient, runtime.ITXClientDenyList>
        ) => Promise<any>
    ) => {
        if (this.db.$transaction) {
            return this.db.$transaction(cb)
        } else {
            return cb(this.db)
        }
    }
}