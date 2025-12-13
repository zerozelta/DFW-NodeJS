import { DFWCore } from "#lib/DFWCore"

export class DFWRepository<TDatabase> {
    private _dfw: DFWCore<TDatabase>
    private _db: any

    get dfw() {
        return this._dfw
    }

    get db() {
        return this._db as TDatabase
    }

    constructor(dfw: DFWCore<TDatabase>) {
        this._dfw = dfw
        this._db = dfw.db
    }

    /**
     *
     * @param db
     * @returns
     */
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