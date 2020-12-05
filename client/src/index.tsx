import './index.css'

import React from 'react'
import ReactDOM from 'react-dom'
import { CSSReset, ThemeProvider, theme } from '@chakra-ui/react'

import * as serviceWorker from 'serviceWorker'
import { useStore } from 'store'
import { Cmd } from 'core'

import * as Main from 'Main'

const init: [Main.State, Cmd<Main.Action>] = [Main.initial, Cmd.none]

const Root: React.FC = () => {
  const [state, dispatch] = useStore({
    init,
    update: Main.update,
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
}

ReactDOM.render(<Root />, document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
