import { DFWCore } from "#lib/DFWCore";
import { PrismaClient } from "#prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const DFW = new DFWCore(
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL
        })
    }),
    {
        port: 300,
        trustProxy: true
    }
)