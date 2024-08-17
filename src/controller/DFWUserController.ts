import DFWUtils from "../DFWUtils";
import DFWController from "./DFWController";

class DFWUserController extends DFWController {

    public async validateUserPasswordAsync(identifier: string, password: any) {
        const isEmail = DFWUtils.isEmail(identifier)
        const nick = isEmail ? undefined : identifier
        const email = isEmail ? identifier : undefined

        const user = await this.db.dfw_user.findUnique({
            select: {
                id: true,
                encodedKey: true
            },
            where: {
                nick,
                email
            }
        })

        if (!user || !user.encodedKey) return null

        const check = await DFWUtils.verifyPassword(user.encodedKey, password)

        if (!check) return false

        return user.id
    }

    public async crateDFWUserAsync({ password, ...params }: { [key: string]: any; nick?: string; email?: string; password: string }) {
        return this.db.dfw_user.create({
            data: {
                ...params,
                encodedKey: password ? await DFWUtils.encryptPassword(password) : undefined
            }
        })
    }
}

export default DFWUserController