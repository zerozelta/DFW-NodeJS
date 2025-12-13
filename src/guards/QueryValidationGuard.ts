import { makeGuard } from "#makers/makeGuard";
import { z, type ZodObject } from "zod";

export const QueryValidationGuard = (scheme: ZodObject) => makeGuard((_, req) => {
    const result = scheme.safeParse(req.query)

    if (!result.success) {
        throw { type: "QUERY_VALIDATION_FAILED", details: z.treeifyError(result.error) }
    }

    Object.assign(req.query, result.data)
})