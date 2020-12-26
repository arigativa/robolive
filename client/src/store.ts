import React from 'react'
import { createStore } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'

import { Dispatch, Cmd, Sub, createStoreWithEffects } from 'core'

export const useStore = <S, A>({
  init,
  update,
  subscriptions
}: {
  init: [S, Cmd<A>]
  update(action: A, state: S): [S, Cmd<A>]
  subscriptions(state: S): Sub<A>
}): [S, Dispatch<A>] => {
  const store = React.useMemo(() => {
    return createStoreWithEffects<S, A, unknown, unknown>(createStore)(
      init,
      update,
      subscriptions,
      composeWithDevTools()
    )
  }, [init, update, subscriptions])

  const [state, setState] = React.useState(store.getState())

  React.useEffect(() => {
    return store.subscribe(() => setState(store.getState()))
  }, [store])

  return [state, store.dispatch]
}
