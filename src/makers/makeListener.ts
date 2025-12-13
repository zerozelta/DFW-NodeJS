import type { APIListener, APIListenerWithoutMethod, ListenerFn } from "#types/APIListener";

export const makeListener = <TPrisma>(baseParams: Partial<APIListener<TPrisma>>) => {
    function listener(
        params: APIListenerWithoutMethod,
        fn: ListenerFn<TPrisma>
    ): APIListener<TPrisma>;

    function listener(
        fn: ListenerFn<TPrisma>
    ): APIListener<TPrisma>;
    function listener(arg1: any, arg2?: any): APIListener<TPrisma> {
        if (typeof arg1 === "function") {
            return {
                fn: arg1,
                ...baseParams,
            };
        } else {
            return {
                fn: arg2!,
                ...arg1,
                ...baseParams,
            };
        }
    }

    return listener;
}