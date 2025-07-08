import { Strategy } from "passport-local"
import DFWUserModule from "../../modules/UserModule"
import DFWUtils from "../DFWUtils"

const DFWPassportStrategy = new Strategy(async (identifier: string, password: any, done) => {
    try {
        const UserControl = new DFWUserModule()
        const id = await UserControl.validateUserPasswordAsync(identifier, password)

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

export default DFWPassportStrategy