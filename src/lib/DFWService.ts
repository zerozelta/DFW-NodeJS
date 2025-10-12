import type { PrismaClient } from "@prisma/client";
import type { DFWDatabase } from "#types/DFWDatabase";
import type { DFWRequestSchema, DFWRequestSession } from "#types/DFWRequest";

export abstract class DFWService {
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