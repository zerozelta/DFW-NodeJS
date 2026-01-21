import type { DFWCore } from "#lib/DFWCore";
import { DFWSessionModule } from "#modules/DFWSessionModule";

export const makeLogoutListener = (DFW: DFWCore) =>
    DFW.listener.post(async (_, req) => {
        const { logoutAsync } = new DFWSessionModule(DFW);
        await logoutAsync(req)
    })
