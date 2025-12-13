import { DFWCore } from "#lib/DFWCore";

export class DFWService<TDatabase, TDeps extends object = {}> {
  protected _dfw: DFWCore<TDatabase>;
  protected _db: TDatabase;
  protected _deps: TDeps;

  get dfw() {
    return this._dfw;
  }

  get db() {
    return this._db;
  }

  get deps() {
    return this._deps;
  }

  constructor(dfw: DFWCore<TDatabase>, deps: TDeps) {
    this._dfw = dfw;
    this._db = dfw.db;
    this._deps = deps;
  }

  public transaction = async <
    R = any,
    TTx extends TDatabase = TDatabase
  >(
    cb: (tx: TTx) => Promise<R>
  ): Promise<R> => {
    const anyDb: any = this._db;
    if (anyDb.$transaction) {
      return anyDb.$transaction(cb);
    } else {
      return cb(this._db as any);
    }
  };
}
