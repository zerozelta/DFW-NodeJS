import { APIListener, APIListenerFunction, APIListenerParams } from "../types/APIListener";

const POSTListener: (fn: APIListenerFunction, params?: APIListenerParams) => APIListener = (fn, params) => {
    return {
        listener: fn,
        params: {
            ...params,
            method: 'post'
        }
    }
}

export default POSTListener