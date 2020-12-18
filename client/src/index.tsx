import './index.css'

import React from 'react'
import ReactDOM from 'react-dom'
import { CSSReset, ThemeProvider, theme } from '@chakra-ui/react'

import * as serviceWorker from 'serviceWorker'
import { useStore } from 'store'
import { Cmd, Sub } from 'core'

import * as Main from 'Main'

interface Action {
  type: 'root'
  payload: Main.Action
}

const root = (payload: Main.Action): Action => ({ type: 'root', payload })

const init: [Main.State, Cmd<Action>] = [Main.initial, Cmd.none]

const update = (
  action: Action,
  state: Main.State
): [Main.State, Cmd<Action>] => {
  const [nextState, cmd] = action.payload.update(state)

  return [nextState, cmd.map(root)]
}

const subscriptions = (state: Main.State): Sub<Action> => {
  return Main.subscriptions(state).map(root)
}

const Root: React.FC = () => {
  const [state, dispatch] = useStore({ init, update, subscriptions })
  const rootDispatch = React.useCallback(
    (action: Main.Action) => dispatch(root(action)),
    [dispatch]
  )

  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CSSReset />

        <Main.View state={state} dispatch={rootDispatch} />
      </ThemeProvider>
    </React.StrictMode>
  )
}

ReactDOM.render(<Root />, document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
