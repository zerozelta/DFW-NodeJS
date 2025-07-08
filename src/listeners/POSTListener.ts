import { makeAPIListenerFunction } from "../lib/APIListener"

const POSTListener = makeAPIListenerFunction({
    method: 'post'
})

export default POSTListener