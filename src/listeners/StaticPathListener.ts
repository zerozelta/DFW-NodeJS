import { static as ExpressStatic } from "express";
import { APIListener, APIListenerWithoutMethod } from "../lib/APIListener";
import { ServeStaticOptions } from "serve-static";

const StaticPathListener: (localPath: string, options?: ServeStaticOptions, params?: APIListenerWithoutMethod) => APIListener = (localPath, options, params) => {
    const { middleware, ...restParams } = params ?? {};

    return {
        middleware: [
            ...(Array.isArray(middleware) ? middleware : middleware ? [middleware] : []),
            ExpressStatic(localPath, options)
        ],
        method: 'use',
        ...restParams
    }
}

export default StaticPathListener