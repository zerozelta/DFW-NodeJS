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

    public async assignCredentialAsync(user: number | dfw_user, credential: dfw_credential | number | string | any[]): Promise<dfw_credential[]> {
        return this.instance.SecurityManager.use(this.db).addCredentialToAsync(user, credential);
    }

}