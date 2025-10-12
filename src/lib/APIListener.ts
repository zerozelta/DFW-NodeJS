import type { DFWServiceConstructor } from "#types/DFWService";
import type { APIListener, APIListenerWithoutMethod, ListenerFn } from "#types/APIListener";

export const makeAPIListenerFunction = (baseParams: Partial<APIListener>) => {
  function listener<TServices extends readonly DFWServiceConstructor[]>(
    params: APIListenerWithoutMethod & { services?: TServices },
    fn: ListenerFn<TServices>
  ): APIListener;

  function listener(
    fn: ListenerFn
  ): APIListener;

  function listener(arg1: any, arg2?: any): APIListener {
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
};