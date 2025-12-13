import type { DFWCore } from "./DFWCore"
import { Strategy } from "passport-local"
import { DFWUtils } from "#lib/DFWUtils"
import { DFWUserRepository } from "#repositories/DFWUserRepository"

export const DFWPassportStrategy = (DFW: DFWCore) => new Strategy(async (identifier: string, password: string, done) => {
    try {
        const { verifyPasswordAsync } = new DFWUserRepository(DFW)
        const id = await verifyPasswordAsync(identifier, password)

        if (id) {
            return done(null, { id })
        } else {
            await DFWUtils.sleepAsync(1500)
            return done('ACCESS_DENIED')
        }
    } catch (e) {
        await DFWUtils.sleepAsync(1500)
        return done(e)
    }
})