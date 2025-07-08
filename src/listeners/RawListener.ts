import { RequestHandler } from "express";
import { APIListener, APIMethod } from "../lib/APIListener";

const RawListener: (method: APIMethod, ...middleware: RequestHandler[]) => APIListener = (method, ...middleware) => {
    return {
        params: {
            method,
            raw: true,
            middleware
        }
    }
}

export default RawListener