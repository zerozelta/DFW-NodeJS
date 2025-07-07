import { dfw_credential, dfw_user } from "@prisma/client";
import DFWUtils from "../lib/DFWUtils";
import DFWRepository from "../lib/DFWRepository";
import DFWSecurityRepository from "./security.repository";

class DFWUserRepository extends DFWRepository {

    public async validateUserPasswordAsync(identifier: string, password: any) {
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

        const check = await DFWUtils.verifyPassword(user.encodedKey, password)

        if (!check) return false

        return user.id
    }

    public async createUserAsync({ password, ...params }: { [key: string]: any; name?: string; email?: string; password: string }) {
        return this.db.dfw_user.create({
            data: {
                ...params,
                encodedKey: password ? await DFWUtils.encryptPassword(password) : undefined
            }
        })
    }

    public async assignCredentialAsync(user: string | Partial<dfw_user>, credential: dfw_credential | string | (dfw_credential | string)[]): Promise<dfw_credential[]> {
        const SecurityControl = new DFWSecurityRepository().use(this.db)
        return SecurityControl.attachUserToCredentialAsync(user, credential);
    }
}

export default DFWUserRepository