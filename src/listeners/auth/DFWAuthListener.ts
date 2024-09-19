import passport from "passport";
import { APIListener, APIListenerFunction } from "../../types/APIListener";
import DFWSessionController from "../../controller/DFWSessionController";

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
                const SessionControl = new DFWSessionController()
                await SessionControl.updateSessionAgentAsync(req)
            },
        },
        listener: fn ?? (() => { return { success: true } })
    }
}

export default DFWAuthListener