import type { APIListener, APIMethod } from "#types/APIListener";
import type { RequestHandler } from "express";

export const RawListener: (method: APIMethod, ...middleware: RequestHandler[]) => APIListener = (method, ...middleware) => {
    return {
        method,
        middleware
    }
}