import { makeAPIListenerFunction } from "../lib/APIListener"

const DELETEListener = makeAPIListenerFunction({
    method: 'delete'
})

export default DELETEListener