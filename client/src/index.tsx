import './index.css'

import React from 'react'
import ReactDOM from 'react-dom'
import CssBaseline from '@material-ui/core/CssBaseline'

import * as serviceWorker from 'serviceWorker'
import { Provider } from 'Provider'
import * as App from 'App'

ReactDOM.render(
  <React.StrictMode>
    <CssBaseline>
      <Provider init={App.init('Munich')} update={App.update} view={App.View} />
    </CssBaseline>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
