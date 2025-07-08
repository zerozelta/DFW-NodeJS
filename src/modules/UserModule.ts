import { dfw_credential, dfw_user } from "@prisma/client";
import DFWUtils from "../lib/DFWUtils";
import DFWModule from "../lib/DFWModule";
import DFWSecurityModule from "./DFWSecurityModule";

class DFWUserModule extends DFWModule {

    async verifyPasswordAsync(identifier: string, password: any) {
        const isEmail = DFWUtils.isEmail(identifier)
        const name = isEmail ? undefined : identifier
        const email = isEmail ? identifier : undefined

        const user = await this.db.dfw_user.findUnique({
            select: {
                id: true,
                encodedKey: true
            },
            where: {
                name,
                email
            }
        })

        if (!user || !user.encodedKey) return null

        const check = await DFWUtils.verifyPasswordAsync(user.encodedKey, password)

        if (!check) return false

        return user.id
    }

    async createUserAsync({ password, ...params }: { [key: string]: any; name?: string; email?: string; password: string }) {
        return this.db.dfw_user.create({
            data: {
                ...params,
                encodedKey: password ? await DFWUtils.encryptPasswordAsync(password) : undefined
            }
        })
    }

    async assignCredentialAsync(user: string | { id: string }, credential: dfw_credential | string | (dfw_credential | string)[]): Promise<dfw_credential[]> {
        const { attachUserToCredentialAsync } = new DFWSecurityModule(this.db)
        return attachUserToCredentialAsync(user, credential);
    }
}

export default DFWUserModule