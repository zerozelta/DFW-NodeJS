import { APIListener, APIListenerFunction, APIListenerParams } from "../types/APIListener";

const PATCHListener: (fn: APIListenerFunction, params?: APIListenerParams) => APIListener = (fn, params) => {
    return {
        listener: fn,
        params: {
            ...params,
            method: 'patch'
        }
    }
}

export default PATCHListener