import './index.css'

import React from 'react'
import ReactDOM from 'react-dom'
import CssBaseline from '@material-ui/core/CssBaseline'

import * as serviceWorker from 'serviceWorker'
import { useStore } from 'store'
import * as Counter from 'Counter'

const Root: React.FC = () => {
  const [state, dispatch] = useStore({
    init: Counter.init,
    update: Counter.update
  })

  return (
    <React.StrictMode>
      <CssBaseline>
        <Counter.View state={state} dispatch={dispatch} />
      </CssBaseline>
    </React.StrictMode>
  )
}

ReactDOM.render(<Root />, document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
