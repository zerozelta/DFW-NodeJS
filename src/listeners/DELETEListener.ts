import { makeAPIListenerFunction } from "#lib/APIListener"

export const DELETEListener = makeAPIListenerFunction({
    method: 'delete'
})