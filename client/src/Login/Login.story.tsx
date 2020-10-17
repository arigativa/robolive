import React from 'react'
import { action } from '@storybook/addon-actions'
import { text } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData/Optional'

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

export const Loading: React.FC = () => (
  <Login.View
    state={{
      ...Login.initial,
      registration: RemoteData.Loading
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
        registration:
          message.length === 0
            ? RemoteData.NotAsked
            : RemoteData.Failure(message)
      }}
      dispatch={action('dispatch')}
    />
  )
}
