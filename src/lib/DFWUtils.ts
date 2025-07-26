import chalk from "chalk";
import { randomUUID } from "crypto";
import { lookup } from "mime-types";
import bcrypt from "bcrypt"
import { createId } from '@paralleldrive/cuid2';
import z from "zod";
import { DFWRequest, DFWRequestSchema, DFWResponse } from "../types";

export default class DFWUtils {

    public static emailSchema = z.string().email()

    public static isEmail(email: string): boolean {
        return this.emailSchema.safeParse(email).success;
    }

    public static log(message: string, isError: boolean = false) {
        if (isError) {
            console.error(`${chalk.blueBright('[DFW]')} ${chalk.red('ERROR')} ${message}`)
        } else {
            console.log(`${chalk.blueBright('[DFW]')} ${message}`)
        }
    }

    /**
     * 
     * @param duration ms of sleeping
     */
    public static async sleepAsync(duration: number): Promise<void> {
        await new Promise(function (resolve) {
            setTimeout(() => { resolve(0) }, duration);
        })
    }

    /**
     * 
     * @param path 
     */
    public static getFileMimetype(path: string): string | null {
        let mimetype = lookup(path);
        return mimetype ? mimetype : null;
    }

    /**
     * retrive file extension 
     * @param filePath 
     */
    public static getFilenameExtension(filePath: string): string {
        return filePath.slice((filePath.lastIndexOf(".") - 1 >>> 0) + 2);
    }

    /**
     * 
     */
    public static generateRandomHexString(len: number): string {
        let maxlen = 8,
            min = Math.pow(16, Math.min(len, maxlen) - 1),
            max = Math.pow(16, Math.min(len, maxlen)) - 1,
            n = Math.floor(Math.random() * (max - min + 1)) + min,
            r = n.toString(16);
        while (r.length < len) {
            r = r + DFWUtils.generateRandomHexString(len - maxlen);
        }
        return r;
    };

    /**
     * 
     */
    public static uuid(): string {
        return randomUUID()
    }

    public static cuid(): string {
        return createId()
    }

    public static async verifyPasswordAsync(encoded: string, test: string): Promise<boolean> {
        return bcrypt
            .compare(test, encoded)
            .catch(err => {
                console.error(err.message)
                return false
            })
    }

    public static async encryptPasswordAsync(password: string): Promise<string> {
        return bcrypt
            .hash(password, 9).catch(err => {
                console.error(err.message)
                throw "[DFW] ERROR HASHING PASSWORD"
            })
    }

    public static makeGuard = (fn: (value: any | undefined, dfw: DFWRequestSchema) => void | Promise<void>) => {
        return (fieldObj?: { body?: string, query?: string, params?: string }) => async (req: DFWRequest, _: DFWResponse, next: (err?: any) => void) => {
            try {
                let value: string | undefined;

                if (fieldObj?.body && req.body?.[fieldObj.body]) {
                    value = req.body[fieldObj.body];
                } else if (fieldObj?.query && req.query?.[fieldObj.query]) {
                    value = req.query[fieldObj.query] as string;
                } else if (fieldObj?.params && req.params?.[fieldObj.params]) {
                    value = req.params[fieldObj.params];
                }

                await fn(value, req.dfw);
                next();
            } catch (err) {
                next(err);
            }
        }
    }
}