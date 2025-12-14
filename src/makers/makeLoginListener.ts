import type { DFWCore } from "#lib/DFWCore";
import { DFWSessionRepository } from "#repositories/DFWSessionRepository";
import passport, { type AuthenticateOptions } from "passport";

/**
 * body params: username password
 * @param DFW 
 * @param options 
 * @returns DFW Auth Listener
 */
export const makeLoginListener = (DFW: DFWCore, options: AuthenticateOptions) => DFW.listener.post({
    middleware: [passport.authenticate('dfw', options)],
}, async (_, req) => {
    const { updateSessionAgentAsync } = new DFWSessionRepository(DFW);
    await updateSessionAgentAsync(req)
})
