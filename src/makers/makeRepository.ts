import type { DFWCore } from "#lib/DFWCore";
import { DFWRepository } from "#lib/DFWRepository";

export type RepositoryInstance<M extends object, TDatabase> = DFWRepository<TDatabase> & M;
export type RepositoryCtor<M extends object, TDatabase> = new (db?: any) => RepositoryInstance<M, TDatabase>;

export function makeRepository<TDatabase, M extends object>(
  dfw: DFWCore<TDatabase>,
  methods: M & ThisType<RepositoryInstance<M, TDatabase>>
): RepositoryCtor<M, TDatabase> {
  class Repository extends DFWRepository<TDatabase> {
    constructor(db?: any) {
      super(dfw);

      for (const key of Object.keys(methods) as (keyof M)[]) {
        const fn = (methods as any)[key];
        if (typeof fn === "function") {
          (this as any)[key] = fn.bind(this);
        }
      }

      this.use(db ?? dfw.db);
    }
  }

  return Repository as RepositoryCtor<M, TDatabase>;
}
