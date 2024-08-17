import passport from "passport";
import { APIListener, APIListenerFunction } from "../../types/APIListener";
import DFWSessionControler from "../../controller/DFWSessionController";

const DFWAuthListener: (fn?: APIListenerFunction) => APIListener = (fn) => {
    return {
        params: {
            method: 'post',
            middleware: [passport.authenticate('dfw')],
            callback: async (req) => {
                const SessionControl = new DFWSessionControler()
                await SessionControl.updateSessionAgentAsync(req)
            },
        },
        listener: fn ?? (() => { return { success: true } })
    }
}

export default DFWAuthListener