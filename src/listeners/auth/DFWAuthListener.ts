import passport from "passport";
import { APIListener, APIListenerFunction } from "../../types/APIListener";
import DFWSessionRepository from "../../repositories/session.repository";

/**
 * Login listener 
 * Method: POST
 * body params: username password
 * @param fn 
 * @returns 
 */
const DFWAuthListener: (fn?: APIListenerFunction) => APIListener = (fn) => {
    return {
        params: {
            method: 'post',
            middleware: [passport.authenticate('dfw')],
            callback: async (req) => {
                const SessionControl = new DFWSessionRepository()
                await SessionControl.updateSessionAgentAsync(req)
            },
        },
        listener: fn ?? (() => { return { success: true } })
    }
}

export default DFWAuthListener