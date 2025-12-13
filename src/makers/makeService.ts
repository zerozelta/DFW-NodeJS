// makeService.ts
import type { DFWCore } from "#lib/DFWCore";
import { DFWService } from "#lib/DFWService";

// Instancia final: base + deps + métodos
export type ServiceInstance<
  TDb,
  TDeps extends object,
  M extends object
> = DFWService<TDb, TDeps> & TDeps & M;

// Constructor de esa instancia
export type ServiceCtor<
  TDb,
  TDeps extends object,
  M extends object
> = new () => ServiceInstance<TDb, TDeps, M>;

export function makeService<
  TDb,
  TDeps extends object,
  M extends object
>(
  dfw: DFWCore<TDb>,
  deps: TDeps,
  methods: M & ThisType<ServiceInstance<TDb, TDeps, M>>
): ServiceCtor<TDb, TDeps, M> {
  class Service extends DFWService<TDb, TDeps> {
    constructor() {
      super(dfw, deps);

      // inyectamos dependencias en this (this.test, this.dfwUser, etc)
      Object.assign(this, deps);

      // bindeamos métodos para que this se mantenga incluso con destructuring
      for (const key of Object.keys(methods) as (keyof M)[]) {
        const fn = (methods as any)[key];
        if (typeof fn === "function") {
          (this as any)[key] = fn.bind(this);
        }
      }
    }
  }

  return Service as ServiceCtor<TDb, TDeps, M>;
}
