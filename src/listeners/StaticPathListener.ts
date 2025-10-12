import type { APIListener, APIListenerWithoutMethod } from "#types/APIListener";
import type { ServeStaticOptions } from "serve-static";
import { static as ExpressStatic } from "express";

export const StaticPathListener: (localPath: string, options?: ServeStaticOptions, params?: APIListenerWithoutMethod) => APIListener = (localPath, options, params) => {
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