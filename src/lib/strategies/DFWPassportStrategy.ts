import { Strategy } from "passport-local"
import DFWUserController from "../../controller/DFWUserController"

const DFWPassportStrategy = new Strategy(async (identifier: string, password: any, done) => {
    try {
        const UserControl = new DFWUserController()
        const id = await UserControl.validateUserPasswordAsync(identifier, password)

        if (id) {
            return done(null, { id })
        } else {
            return done('ACCESS_DENIED')
        }
    } catch (e) {
        return done(e)
    }
})

export default DFWPassportStrategy