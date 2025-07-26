import { PrismaClient, } from "@prisma/client";
import { ITXClientDenyList } from "@prisma/client/runtime/library";

export type DFWDatabase = Omit<PrismaClient, ITXClientDenyList>