import type { DFWCore } from "#lib/DFWCore";
import type { dfw_credential, PrismaClient } from "#prisma/client";
import { DFWRepository } from "#lib/DFWRepository";
import { DFWUtils } from "#lib/DFWUtils";
import { DFWSecurityRepository } from "#repositories/DFWSecurityRepository";

export class DFWUserRepository extends DFWRepository<PrismaClient> {
    constructor(DFW: DFWCore) {
        super(DFW);
    }

    async verifyPasswordAsync(identifier: string, password: any) {
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

    async createUserAsync({ password, ...params }: { [key: string]: any; name?: string; email?: string; password: string }) {
        return this.db.dfw_user.create({
            data: {
                ...params,
                encodedKey: password ? await DFWUtils.encryptPasswordAsync(password) : undefined
            }
        })
    }

    async assignCredentialAsync(user: string | { id: string }, credential: dfw_credential | string | (dfw_credential | string)[]): Promise<dfw_credential[]> {
        const { attachUserToCredentialAsync } = new DFWSecurityRepository(this.dfw)
        return attachUserToCredentialAsync(user, credential);
    }
}