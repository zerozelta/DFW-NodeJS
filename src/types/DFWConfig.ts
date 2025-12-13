import type { CorsOptions } from "cors"
import type { CookieOptions } from "express-session"

export type DFWConfig = {
    port?: number
    cors?: CorsOptions
    trustProxy?: boolean | number
    tmpDir?: string

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
         * Cookie options, more info: https://www.npmjs.com/package/express-session#cookie
         */
        cookieOptions?: CookieOptions

        /**
         * Session id cached on sever default 300
         */
        sessionCacheSize?: number
    }
}