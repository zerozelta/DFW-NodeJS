import { APIListener, APIListenerFunction, APIListenerParams } from "../types/APIListener";

const PUTListener: (fn: APIListenerFunction, params?: APIListenerParams) => APIListener = (fn, params) => {
    return {
        listener: fn,
        params: {
            ...params,
            method: 'put'
        }
    }
}

export default PUTListener