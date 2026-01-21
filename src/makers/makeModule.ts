import type { DFWCore } from "#lib/DFWCore";
import { DFWModule } from "#lib/DFWModule";

export type ModuleInstance<M extends object, TDatabase> = DFWModule<TDatabase> & M;
export type ModuleCtor<M extends object, TDatabase> = new (db?: any) => ModuleInstance<M, TDatabase>;

export function makeModule<TDatabase, M extends object>(
  dfw: DFWCore<TDatabase>,
  methods: M & ThisType<ModuleInstance<M, TDatabase>>
): ModuleCtor<M, TDatabase> {
  class Module extends DFWModule<TDatabase> {
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

  return Module as ModuleCtor<M, TDatabase>;
}
