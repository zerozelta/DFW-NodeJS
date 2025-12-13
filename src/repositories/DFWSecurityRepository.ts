import type { DFWCore } from "#lib/DFWCore";
import type { dfw_credential, dfw_user, PrismaClient } from "#prisma/client";
import { DFWRepository } from "#lib/DFWRepository";

export class DFWSecurityRepository extends DFWRepository<PrismaClient> {
    constructor(DFW: DFWCore) {
        super(DFW);
    }

    async createCredentiaAsync(name: string, description?: string) {
        return this.db.dfw_credential.create({ data: { name, description } });
    }

    async createAccessAsync(name: string, description?: string) {
        return this.db.dfw_access.create({ data: { name, description } });
    }

    async attachUserToCredentialAsync(user: string | { id: string }, credential: dfw_credential | string | (dfw_credential | string)[]) {
        const idUser = typeof user === "object" ? user.id : user;
        if (Array.isArray(credential)) {
            let result: any = await Promise.all(credential.map((credentialObj) => this.attachUserToCredentialAsync(user, credentialObj)))
            return result.flat(1);
        } else {
            let idCredential: string;

            if (typeof credential == "string") {
                let credentialObj = (await this.db.dfw_credential.findFirst({ select: { name: true }, where: { name: credential } }));
                if (credentialObj) { idCredential = credentialObj.name; } else { return [] }
            } else {
                idCredential = credential.name;
            }

            const newCredential = await this.db.dfw_credential.update({
                data: {
                    users: {
                        connect: {
                            id: idUser
                        }
                    }
                },
                where: {
                    name: idCredential
                }
            }).catch((e) => []);

            return Array.isArray(newCredential) ? newCredential : [newCredential];
        }
    }

    async attachAccessToCredentialAsync(access: string | { name: string }, credential: { name: string } | string) {
        const idAccess = typeof access === 'object' ? access.name : access
        const idCredential = typeof credential === 'object' ? credential.name : credential

        const newCredential = await this.db.dfw_credential.update({
            data: {
                access: {
                    connect: {
                        name: idAccess
                    }
                }
            },
            where: {
                name: idCredential
            }
        }).catch(() => []);

        return newCredential
    }

    async userHasCredentialAsync(userSource: string | { id: string }, credential: string) {
        const idUser = typeof userSource === 'object' ? userSource.id : userSource

        const user = await this.db.dfw_user.findUnique({
            select: { id: true },
            where: {
                id: idUser,
                credentials: {
                    some: {
                        OR: [
                            { name: credential }
                        ]
                    }
                }
            }
        })

        return !!user
    }

    userHasAccessAsync = async (userSource: string | Partial<dfw_user>, access: string) => {
        const idUser = typeof userSource === 'object' ? userSource.id : userSource

        const user = await this.db.dfw_user.findUnique({
            select: { id: true },
            where: {
                id: idUser,
                credentials: {
                    some: {
                        access: {
                            some: {
                                name: access
                            }
                        }
                    }
                }
            }
        })

        return !!user
    }
}