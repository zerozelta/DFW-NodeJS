import { makeAPIListenerFunction } from "#lib/APIListener"

export const PATCHListener = makeAPIListenerFunction({
    method: 'patch'
})