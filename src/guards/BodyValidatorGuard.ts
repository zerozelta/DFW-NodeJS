import { makeGuard } from "#makers/makeGuard";
import { z, type ZodObject } from "zod";

export const BodyValidationGuard = (scheme: ZodObject) => makeGuard((_, req) => {
    const result = scheme.safeParse(req.body)

    if (!result.success) {
        throw { type: "BODY_VALIDATION_FAILED", details: z.treeifyError(result.error) }
    }

    req.body = result.data;
})