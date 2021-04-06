import './index.css'

import React from 'react'
import ReactDOM from 'react-dom'
import { CSSReset, ThemeProvider, theme } from '@chakra-ui/react'

import * as serviceWorker from 'serviceWorker'
import { useStore } from 'store'
import { Cmd } from 'core'

import * as Main from 'Main'

const init: [Main.State, Cmd<Main.Action>] = Main.getInitial()

const update = (
  action: Main.Action,
  state: Main.State
): [Main.State, Cmd<Main.Action>] => action.update(state)

const Root = React.memo(() => {
  const [state, dispatch] = useStore({
    init,
    update,
    subscriptions: Main.subscriptions
  })

  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CSSReset />

        <Main.View state={state} dispatch={dispatch} />
      </ThemeProvider>
    </React.StrictMode>
  )
})

ReactDOM.render(<Root />, document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
