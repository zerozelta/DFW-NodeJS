import { Strategy } from "passport-local"
import { DFWUtils } from "#lib/DFWUtils"
import { DFWUserModule } from "#modules/DFWUserModule"

export const DFWPassportStrategy = new Strategy(async (identifier: string, password: string, done) => {
    try {
        const UserControl = new DFWUserModule()
        const id = await UserControl.verifyPasswordAsync(identifier, password)

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