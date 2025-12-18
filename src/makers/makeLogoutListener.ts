import type { DFWCore } from "#lib/DFWCore";
import { DFWSessionRepository } from "#repositories/DFWSessionRepository";

export const makeLogoutListener = (DFW: DFWCore) =>
    DFW.listener.post(async (_, req) => {
        const { logoutAsync } = new DFWSessionRepository(DFW);
        await logoutAsync(req)
    })
