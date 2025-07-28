import passport from "passport";
import DFWSessionModule from "../../modules/SessionModule";
import { APIListener, ListenerFn } from "../../lib/APIListener";

/**
 * Login listener 
 * Method: POST
 * body params: username password
 * @param fn 
 * @returns 
 */
const DFWAuthListener: (fn?: ListenerFn) => APIListener = (fn) => ({
    method: 'post',
    middleware: [passport.authenticate('dfw')],
    fn: fn ?? (() => { return 'success' }),
    callback: async (req) => {
        const SessionControl = new DFWSessionModule()
        await SessionControl.updateSessionAgentAsync(req)
    },
})

export default DFWAuthListener