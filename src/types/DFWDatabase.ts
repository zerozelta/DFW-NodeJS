import type { PrismaClient, } from "#prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/client";

export type DFWDatabase = Omit<PrismaClient, ITXClientDenyList>