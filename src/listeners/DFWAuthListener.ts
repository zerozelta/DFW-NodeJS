import type { APIListener, ListenerFn } from "#types/APIListener";
import { DFWSessionModule } from "#modules/DFWSessionModule";
import passport from "passport";

/**
 * Login listener 
 * Method: POST
 * body params: username password
 * @param fn 
 * @returns 
 */
export const DFWAuthListener: (fn?: ListenerFn) => APIListener = (fn) => ({
    method: 'post',
    middleware: [passport.authenticate('dfw')],
    fn: fn ?? (() => { return 'success' }),
    callback: async (req) => {
        const SessionControl = new DFWSessionModule()
        await SessionControl.updateSessionAgentAsync(req)
    },
})