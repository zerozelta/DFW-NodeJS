import type { ListenerFn } from "#types/APIListener";
import type { DFWRequest, DFWResponse } from "#types/DFWRequest";

export const makeGuard = <TDatabase = any>(fn: ListenerFn<TDatabase>) => {
    return async (req: DFWRequest<TDatabase>, res: DFWResponse, next: (err?: any) => void) => {
        try {
            await fn(req.dfw, req, res);
            next();
        } catch (err) {
            next(err);
        }
    }
}