import { dfw_credential, dfw_user } from "@prisma/client";
import DFWUtils from "../DFWUtils";
import DFWController from "./DFWController";
import DFWSecurityController from "./DFWSecurityController";

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

    public async createUserAsync({ password, ...params }: { [key: string]: any; nick?: string; email?: string; password: string }) {
        return this.db.dfw_user.create({
            data: {
                ...params,
                encodedKey: password ? await DFWUtils.encryptPassword(password) : undefined
            }
        })
    }

    public async assignCredentialAsync(user: number | Partial<dfw_user>, credential: dfw_credential | number | string | (dfw_credential | number | string)[]): Promise<dfw_credential[]> {
        const SecurityControl = new DFWSecurityController().use(this.db)
        return SecurityControl.attachUserToCredentialAsync(user, credential);
    }
}

export default DFWUserController