import { PrismaClient } from "@prisma/client";
import { DFWRequestSchema } from "../types";

export type DFWServiceConstructor = new (dfw: any) => DFWService;

export type InferServiceInstance<T extends DFWServiceConstructor> =
  T extends new () => infer R ? R : never;

export type MapServiceConstructors<T extends readonly DFWServiceConstructor[]> = {
  [K in keyof T as T[K] extends DFWServiceConstructor
  ? InstanceType<T[K]>['namespace']
  : never]: T[K] extends DFWServiceConstructor
  ? InstanceType<T[K]>
  : never;
};

export default abstract class DFWService {
  abstract readonly namespace: string;

  protected readonly db: PrismaClient
  protected readonly user?: { id: string }

  constructor(dfw: DFWRequestSchema) {
    this.db = dfw.db;
    this.user = dfw.getSession().user;
  }

  public buildTransaction = (fn: (db: any) => Promise<any>) => this.db.$transaction(async (db) => {
    return fn(db)
  })

}