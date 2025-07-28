import DFWSessionModule from "../../modules/SessionModule";
import { APIListener, ListenerFn } from "../../lib/APIListener";

/**
 * Logout listener 
 * Method: POST
 * @param fn 
 * @returns 
 */
const DFWLogoutListener: (fn?: ListenerFn) => APIListener = (fn) => ({
    method: 'post',
    middleware: [async (req, _, next) => {
        const { logoutAsync } = new DFWSessionModule()
        await logoutAsync(req)
        next()
    }],
    fn: fn ?? (() => { return 'success' })
})

export default DFWLogoutListener