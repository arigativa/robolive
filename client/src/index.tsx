import './index.css'

import React from 'react'
import ReactDOM from 'react-dom'
import { CSSReset, ChakraProvider } from '@chakra-ui/react'

import * as serviceWorker from 'serviceWorker'
import { useStore } from 'store'

import * as Main from 'Main'

const Root = React.memo(() => {
  const [state, dispatch] = useStore({
    init: Main.initial,
    update: Main.update,
    subscriptions: Main.subscriptions
  })

  return (
    <React.StrictMode>
      <ChakraProvider>
        <CSSReset />

        <Main.View state={state} dispatch={dispatch} />
      </ChakraProvider>
    </React.StrictMode>
  )
})

ReactDOM.render(<Root />, document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
