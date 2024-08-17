import { CorsOptions } from "cors"
import { CookieOptions } from "express-session"

export type DFWConfig = {

    server?: {
        port?: number
        cors?: CorsOptions
        trustProxy?: boolean | number
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

        cookieOptions?: CookieOptions
    }

    /**
     * 
     */
    database?: {
        log?: boolean;
    }
}