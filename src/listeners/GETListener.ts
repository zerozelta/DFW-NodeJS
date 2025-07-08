import { makeAPIListenerFunction } from "../lib/APIListener";

const GETListener = makeAPIListenerFunction({
    method: 'get'
})

export default GETListener