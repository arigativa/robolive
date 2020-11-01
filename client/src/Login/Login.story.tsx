import React from 'react'
import { action } from '@storybook/addon-actions'
import { text } from '@storybook/addon-knobs'
import Maybe from 'frctl/Maybe'

import * as Login from '.'

export default {
  title: 'Login'
}

export const Initial: React.FC = () => (
  <Login.View state={Login.initial} dispatch={action('dispatch')} />
)

export const Empty: React.FC = () => (
  <Login.View
    state={{
      ...Login.initial,
      username: ''
    }}
    dispatch={action('dispatch')}
  />
)

export const WithValues: React.FC = () => (
  <Login.View
    state={{
      ...Login.initial,
      username: text('Username', 'user_cat')
    }}
    dispatch={action('dispatch')}
  />
)

export const Failure: React.FC = () => {
  const message = text('Error Message', 'Oops something went wrong')

  return (
    <Login.View
      state={{
        ...Login.initial,
        error: message.length === 0 ? Maybe.Nothing : Maybe.Just(message)
      }}
      dispatch={action('dispatch')}
    />
  )
}
