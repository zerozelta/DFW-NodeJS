import { makeAPIListenerFunction } from "#lib/APIListener"

export const POSTListener = makeAPIListenerFunction({
    method: 'post'
})