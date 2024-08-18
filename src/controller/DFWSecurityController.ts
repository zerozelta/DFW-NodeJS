import { dfw_access, dfw_credential, dfw_user } from "@prisma/client";
import DFWController from "./DFWController";

class DFWSecurityController extends DFWController {
    public async createCredentiaAsync(name: string, description?: string) {
        return this.db.dfw_credential.create({ data: { name, description } });
    }

    public async createAccessAsync(name: string, description?: string) {
        return this.db.dfw_access.create({ data: { name, description } });
    }

    public async attachUserToCredentialAsync(user: number | Partial<dfw_user>, credential: dfw_credential | number | string | (dfw_credential | number | string)[]) {
        const idUser = typeof user === "object" ? user.id : user;
        if (Array.isArray(credential)) {
            let result = await Promise.all(credential.map((credentialObj) => this.attachUserToCredentialAsync(user, credentialObj)))
            return result.flat(1);
        } else {
            let idCredential: number;

            if (typeof credential == "number") {
                idCredential = credential;
            } else if (typeof credential == "string") {
                let credentialObj = (await this.db.dfw_credential.findFirst({ select: { id: true }, where: { name: credential } }));
                if (credentialObj) { idCredential = credentialObj.id; } else { return [] }
            } else {
                idCredential = credential.id;
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
                    id: idCredential
                }
            }).catch((e) => []);

            return Array.isArray(newCredential) ? newCredential : [newCredential];
        }
    }

    public async attachAccessToCredentialAsync(access: number | Partial<dfw_access>, credential: Partial<dfw_credential> | number) {
        const idAccess = typeof access === 'object' ? access.id : access
        const idCredential = typeof credential === 'object' ? credential.id : credential

        const newCredential = await this.db.dfw_credential.update({
            data: {
                access: {
                    connect: {
                        id: idAccess
                    }
                }
            },
            where: {
                id: idCredential
            }
        }).catch(() => []);

        return newCredential
    }

    public async userHasCredentialAsync(userSource: number | Partial<dfw_user>, credential: string) {
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
}

export default DFWSecurityController