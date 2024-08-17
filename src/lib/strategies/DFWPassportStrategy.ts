import { Strategy } from "passport-local"
import DFWUserController from "../../controller/DFWUserController"

const DFWPassportStrategy = new Strategy(async (identifier: string, password: any, done) => {
    try {
        const UserControl = new DFWUserController()
        const id = await UserControl.validateUserPasswordAsync(identifier, password)

        if (id) {
            done(null, { id })
        } else {
            done('ACCESS_DENIED', { id })
        }
    } catch (e) {
        done(e)
    }
})

export default DFWPassportStrategy