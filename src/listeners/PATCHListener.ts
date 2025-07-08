import { makeAPIListenerFunction } from "../lib/APIListener"

const PATCHListener = makeAPIListenerFunction({
    method: 'patch'
})

export default PATCHListener