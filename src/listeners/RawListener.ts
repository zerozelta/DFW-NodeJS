import { RequestHandler } from "express";
import { APIListener, APIMethod } from "../lib/APIListener";

const RawListener: (method: APIMethod, ...middleware: RequestHandler[]) => APIListener = (method, ...middleware) => {
    return {
        method,
        middleware
    }
}

export default RawListener