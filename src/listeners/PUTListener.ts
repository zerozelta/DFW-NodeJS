import { makeAPIListenerFunction } from "#lib/APIListener"

export const PUTListener = makeAPIListenerFunction({
    method: 'put'
})