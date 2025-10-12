import { makeAPIListenerFunction } from "#lib/APIListener"

export const GETListener = makeAPIListenerFunction({
    method: 'get'
})