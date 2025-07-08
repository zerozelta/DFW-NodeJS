import { makeAPIListenerFunction } from "../lib/APIListener"

const PUTListener = makeAPIListenerFunction({
    method: 'put'
})

export default PUTListener