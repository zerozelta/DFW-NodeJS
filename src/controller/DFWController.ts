import { PrismaClient } from "@prisma/client"
import * as runtime from "@prisma/client/runtime/library"
import { DFWCore } from ".."

class DFWController {
    private _db: PrismaClient = DFWCore.MAIN_INSTANCE.db

    get db() {
        return this._db
    }

    get DFW() {
        return DFWCore.MAIN_INSTANCE
    }

    /**
     *
     * @param db
     * @returns
     */
    public use(
        db: PrismaClient | Omit<PrismaClient, runtime.ITXClientDenyList>
    ): this {
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

export default DFWController