import type { APIListener, ListenerFn } from "#types/APIListener"
import { DFWSessionModule } from "#modules/DFWSessionModule"

/**
 * Logout listener 
 * Method: POST
 * @param fn 
 * @returns 
 */
export const DFWLogoutListener: (fn?: ListenerFn) => APIListener = (fn) => ({
    method: 'post',
    middleware: [async (req, _, next) => {
        const { logoutAsync } = new DFWSessionModule()
        await logoutAsync(req)
        next()
    }],
    fn: fn ?? (() => { return 'success' })
})