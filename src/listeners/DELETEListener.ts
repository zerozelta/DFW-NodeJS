import { APIListener, APIListenerFunction, APIListenerParams } from "../types/APIListener";

const DELETEListener: (fn: APIListenerFunction, params?: APIListenerParams) => APIListener = (fn, params) => {
    return {
        listener: fn,
        params: {
            ...params,
            method: 'delete'
        }
    }
}

export default DELETEListener