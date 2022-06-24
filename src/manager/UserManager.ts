import { Response } from "express";
import SecurityManager from "./SecurityManager";
import DFWUtils from "../DFWUtils";
import DFWModule from "./DFWModule";
import { DFWRequest } from "../types/DFWRequestScheme";
import DFWInstance from "../DFWInstance";
import { dfw_credential, dfw_user } from "@prisma/client";

export default class UserManager extends DFWModule {

    constructor(DFW: DFWInstance) {
        super(DFW);
    }

    public middleware = async ({ dfw }: DFWRequest, res: Response) => {
        dfw.UserManager = this;
    }

    public async createUserAsync(email: string, nick: string, password?: string) {
        return this.db.dfw_user.create({
            data: {
                nick,
                email,
                encodedKey: password ? SecurityManager.encryptPassword(password) : undefined
            }
        });
    }

    public async getUserAsync(reference: string) {
        if (DFWUtils.isEmail(reference)) {
            return await this.db.dfw_user.findFirst({ where: { email: reference } });
        } else {
            return await this.db.dfw_user.findFirst({ where: { nick: reference } });
        }
    }

    public async createCredentiaASync(name: string, description?: string) {
        return this.db.dfw_credential.create({ data: { name, description } });
    }

    public async createAccessAsync(name: string, description?: string) {
        return this.db.dfw_access.create({ data: { name, description } });
    }

    public async addCredentialAsync(user: dfw_user, credential: dfw_credential | number | string | any[]): Promise<dfw_credential[]> {
        if (Array.isArray(credential)) {
            let result = await Promise.all(credential.map((credentialObj) => this.addCredentialAsync(user, credentialObj)))
            return result.flat(1);
        } else {
            let idCredential: number;

            if (typeof credential == "number") {
                idCredential = credential;
            } else if (typeof credential == "string") {
                let credentialObj = (await this.db.dfw_credential.findFirst({ where: { name: credential } }));
                if (credentialObj) { idCredential = credentialObj.id; } else { return [] }
            } else {
                idCredential = credential.id;
            }

            let newCredential = await this.db.dfw_credential.update({
                data: {
                    users: {
                        create: {
                            user: {
                                connect: {
                                    id: user.id
                                }
                            }
                        }
                    }
                },
                where: {
                    id: idCredential
                }
            }).catch((e) => []) as any;
            return Array.isArray(newCredential) ? newCredential : [newCredential];
        }
    }

}