import { PrismaClient } from "@prisma/client"
import { CorsOptions } from "cors"
import { CookieOptions } from "express-session"
import { DFWCore } from ".."
import { PrismaClientOptions } from "@prisma/client/runtime/library"

export type DFWConfig = {

    server?: {
        port?: number

        /** CORS config for entire server */
        cors?: CorsOptions

        trustProxy?: boolean | number

        // Temporal directory path
        tmpDir?: string
    }

    /**
     * 
     */
    session?: {
        /**
         * Passport auth config, by default dfw is always enabled unless you set it to false
         */
        authenticators?: {
            dfw?: false
        }

        /**
         * Default days to expire session in database (only in database cookie will not be affected)
         */
        daysToExpire?: number;

        /**
         * Store every session in database no matter if is logged or not, ideal for tracking visitors 
         * @default false
         */
        saveAllSessions?: boolean

        /**
         * Secret to encode cookie session 
         * @default "default"
         */
        secret?: string

        /**
         * Session cookie name
         * @default stk
         */
        cookieName?: string

        /**
         * 
         */
        cookieOptions?: CookieOptions

        /**
         * Session id cached on sever default 300
         */
        sessionCacheSize?: number
    }

    /**
     * Prisma client options
     */
    prisma?: Omit<PrismaClientOptions, '__internal'> | ((dfw: DFWCore) => PrismaClient)
}