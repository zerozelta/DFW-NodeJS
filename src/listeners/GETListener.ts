import { APIListener, APIListenerFunction, APIListenerParams } from "../types/APIListener";

const GETListener: (fn: APIListenerFunction, params?: APIListenerParams) => APIListener = (fn, params) => {
    return {
        listener: fn,
        params: {
            ...params,
            method: 'get'
        }
    }
}

export default GETListener