import { DFWCore } from "#lib/DFWCore"

export class DFWModule<TDatabase> {
    private _dfw: DFWCore<TDatabase>
    private _db: any

    get dfw() {
        return this._dfw
    }

    get db() {
        return this._db as TDatabase
    }

    constructor(dfw: DFWCore<TDatabase>, db?: TDatabase) {
        this._dfw = dfw
        this._db = db ?? dfw.db
    }

    public use = (
        db: any
    ): this => {
        this._db = db
        return this
    }

    public transaction = async (
        cb: (
            tx: Omit<TDatabase, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">
        ) => Promise<any>
    ) => {
        if (this._db.$transaction) {
            return this._db.$transaction(cb)
        } else {
            return cb(this._db)
        }
    }
}