import { Request, Response } from "express";
import { DFWRequest } from "../types/DFWRequestScheme";
import { ListenerSecurityConfig } from "../types/APIListenerConfig";
import DFWModule from "./DFWModule";
import { dfw_access, dfw_credential, dfw_user } from "@prisma/client";
import bcrypt from 'bcrypt'

export type SecurityScheme = {
    hasAccessAsync: (access: string | string[] | number | number[] | dfw_access | dfw_access[]) => Promise<boolean>
    hasCredentialsAsync: (credentials: string | string[] | number | number[] | dfw_credential | dfw_credential[]) => Promise<boolean>
}

export default class SecurityManager extends DFWModule {

    static readonly RULE_LOGGED_SESSION = 0;
    static readonly RULE_ACCESS = 1;
    static readonly RULE_CREDENTIAL = 2;
    static readonly RULE_BODY_PARAMS_SETTED = 3;
    static readonly RULE_QUERY_PARAMS_SETTED = 4;

    static readonly RULE_LABELS = {
        [SecurityManager.RULE_LOGGED_SESSION]: "access denied (you need to be logged)",
        [SecurityManager.RULE_ACCESS]: "access denied (you dond have the access to this)",
        [SecurityManager.RULE_CREDENTIAL]: "access denied (you dond have the credentials to this)",
        [SecurityManager.RULE_BODY_PARAMS_SETTED]: "missing post arguments setted",
        [SecurityManager.RULE_QUERY_PARAMS_SETTED]: "missing query arguments setted",
    }

    public middleware = async (req: DFWRequest, res: Response) => {
        req.dfw.SecurityManager = this;
    }

    /**
     * Genera un array de security bindings a partir de un obejto ListenerSecurityConfig
     * @param securityObject 
     */
    public static jsonToBindings(securityObject: ListenerSecurityConfig): [number, any][] {
        let bindings: [number, any][] = [];

        if (securityObject.session !== undefined) {
            bindings.push([SecurityManager.RULE_LOGGED_SESSION, securityObject.session ? true : false]);
        }

        if (securityObject.credentials) {
            bindings.push([SecurityManager.RULE_CREDENTIAL, securityObject.credentials]);
        }

        if (securityObject.access) {
            bindings.push([SecurityManager.RULE_ACCESS, securityObject.access]);
        }

        if (securityObject.validation) {
            if (securityObject.validation.body) {
                bindings.push([SecurityManager.RULE_BODY_PARAMS_SETTED, securityObject.validation.body]);
            }
            if (securityObject.validation.query) {
                bindings.push([SecurityManager.RULE_QUERY_PARAMS_SETTED, securityObject.validation.query]);
            }
        }

        if (securityObject.bindings) {
            for (let binding of securityObject.bindings) {
                bindings.push(binding);
            }
        }

        return bindings;
    };

    public static async verifyPassword(encoded: string, test: string): Promise<boolean> {
        return bcrypt
            .compare(test, encoded)
            .catch(err => {
                console.error(err.message)
                return false
            })
    }

    public static async encryptPassword(password: string): Promise<string> {
        return bcrypt
            .hash(password, 9).catch(err => {
                console.error(err.message)
                throw "[DFW] ERROR HASHING PASSWORD"
            })
    }

    /**
     * Check all security bindings from a request
     * @param req 
     * @param bindings 
     */
    public async checkBindingArrayAsync(req: DFWRequest, bindings: [number, any][]): Promise<boolean> {
        for (let i = 0; i < bindings.length; i++) {
            let binding = bindings[i];
            if (await this.checkBindingAsync(req, binding[0], binding[1]) === false) {
                return false;
            }
        }

        return true;
    }

    /**
     * 
     * @param req 
     * @param type 
     * @param value 
     */
    public async checkBindingAsync(req: DFWRequest, type: number, value: any | any[]): Promise<boolean> {
        switch (type) {
            case SecurityManager.RULE_LOGGED_SESSION: {
                return req.dfw.session.isLogged === value;              // checks session state
            }

            case SecurityManager.RULE_CREDENTIAL: {
                return await this.checkUserCredentialsAsync(req.dfw.session.user, value);  // checks credentials array
            }

            case SecurityManager.RULE_ACCESS: {
                return await this.checkUserAccessAsync(req.dfw.session.user, value);      // checks access array
            }

            case SecurityManager.RULE_BODY_PARAMS_SETTED: {
                return this.checkBodyParams(req, value);                 // Check params array on body
            }

            case SecurityManager.RULE_QUERY_PARAMS_SETTED: {
                return this.checkQueryParams(req, value);                 // Check params array on body
            }

            default: {
                return false; // UNKNOWN RULE always return false
            }
        }
    }

    public async createCredentialAsync(name: string): Promise<dfw_credential> {
        return this.db.dfw_credential.create({ data: { name, } });
    }

    public async checkUserCredentialsAsync(user: dfw_user | null | undefined, credential: dfw_credential | dfw_credential[] | string | string[]) {
        if (!user) return false;
        return false;
    }

    public async checkUserAccessAsync(user: dfw_user | null | undefined, access: dfw_access | dfw_access[] | string | string[]) {
        if (!user) return false;
        return false
    }

    public async addCredentialToAsync(user: number | dfw_user, credential: dfw_credential | number | string | any[]) {
        const idUser = typeof user === "object" ? user.id : user;
        if (Array.isArray(credential)) {
            let result = await Promise.all(credential.map((credentialObj) => this.addCredentialToAsync(user, credentialObj)))
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
                        connect: {
                            id: idUser
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

    public checkBodyParams(req: Request, params: string[]): boolean {
        let keys = req.body ? Object.keys(req.body) : [];
        return keys.length >= params.length && params.every(v => keys.includes(v))
    }

    public checkQueryParams(req: Request, params: string[]): boolean {
        let keys = req.query ? Object.keys(req.query) : [];
        return keys.length >= params.length && params.every(v => keys.includes(v));
    }

}