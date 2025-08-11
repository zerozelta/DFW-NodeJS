import { PrismaClient } from "@prisma/client";
import { DFWRequestSchema, DFWRequestSession } from "../types";
import { DFWDatabase } from "../types/DFWDatabase";

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
  protected readonly session: DFWRequestSession

  constructor(dfw: DFWRequestSchema) {
    this.db = dfw.db;
    this.session = dfw.getSession()
  }

  protected buildTransaction = <T>(fn: (db: DFWDatabase) => Promise<T>): Promise<T> => {
    return this.db.$transaction(async (db) => {
      return fn(db);
    });
  }

  protected buildMethod = <T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> => {
    return fn(this.db)
  }

}