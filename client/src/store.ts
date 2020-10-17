import React from 'react'
import { createStore, Action } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'

import { Dispatch, Effects, createStoreWithEffects } from 'core'

export const useStore = <S, A extends Action>({
  init,
  update
}: {
  init: [S, Effects<A>]
  update(action: A, state: S): [S, Effects<A>]
}): [S, Dispatch<A>] => {
  const store = React.useMemo(() => {
    return createStoreWithEffects<S, A, unknown, unknown>(createStore)(
      init,
      update,
      composeWithDevTools()
    )
  }, [init, update])

  const [state, setState] = React.useState(store.getState())

  React.useEffect(() => {
    return store.subscribe(() => setState(store.getState()))
  }, [store])

  return [state, store.dispatch]
}
