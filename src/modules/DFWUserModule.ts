import type { dfw_credential } from "@prisma/client";
import { DFWModule } from "#lib/DFWModule";
import { DFWUtils } from "#lib/DFWUtils";
import { DFWSecurityModule } from "#modules/DFWSecurityModule";

export class DFWUserModule extends DFWModule {

    verifyPasswordAsync = async (identifier: string, password: any) => {
        const isEmail = DFWUtils.isEmail(identifier)

        const user = await this.db.dfw_user.findUnique({
            select: {
                id: true,
                encodedKey: true
            },
            where: {
                [isEmail ? 'email' : 'name']: identifier
            } as any
        })

        if (!user || !user.encodedKey) return null

        const check = await DFWUtils.verifyPasswordAsync(user.encodedKey, password)

        if (!check) return false

        return user.id
    }

    createUserAsync = async ({ password, ...params }: { [key: string]: any; name?: string; email?: string; password: string }) => {
        return this.db.dfw_user.create({
            data: {
                ...params,
                encodedKey: password ? await DFWUtils.encryptPasswordAsync(password) : undefined
            }
        })
    }

    assignCredentialAsync = async (user: string | { id: string }, credential: dfw_credential | string | (dfw_credential | string)[]): Promise<dfw_credential[]> => {
        const { attachUserToCredentialAsync } = new DFWSecurityModule(this.db)
        return attachUserToCredentialAsync(user, credential);
    }
}