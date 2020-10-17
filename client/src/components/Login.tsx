import React from 'react'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData/Optional'

import { Dispatch, Effects, caseOf, match } from 'core'
import * as SIP from 'sip'
import { Credentials } from 'credentials'
import { hasWhitespaces } from 'utils'

// S T A T E

export type State = {
  username: string
  registration: RemoteData<string, never>
}

export const initial: State = {
  username: 'robohuman',
  registration: RemoteData.NotAsked
}

// U P D A T E

export type Action =
  | ReturnType<typeof ChangeUsername>
  | typeof SignIn
  | ReturnType<typeof Register>

const SignIn = caseOf('SignIn')()
const Register = caseOf<'Register', Either<string, SIP.UserAgent>>('Register')
const ChangeUsername = caseOf<'ChangeUsername', string>('ChangeUsername')

export type Stage = ReturnType<typeof Updated> | ReturnType<typeof Registered>

const Updated = caseOf<'Updated', [State, Effects<Action>]>('Updated')
const Registered = caseOf<'Registered', Credentials>('Registered')

export const update = (action: Action, state: State): Stage => {
  return match<Action, Stage>(
    {
      ChangeUsername: username => {
        return Updated([
          {
            ...state,
            username
          },
          []
        ])
      },

      SignIn: () => {
        if (hasWhitespaces(state.username)) {
          return Updated([
            {
              ...state,
              registration: RemoteData.Failure(
                'Username must have no white spaces'
              )
            },
            []
          ])
        }

        if (state.username.length === 0) {
          return Updated([
            {
              ...state,
              registration: RemoteData.Failure('Username must be not empty')
            },
            []
          ])
        }

        return Updated([
          {
            ...state,
            registration: RemoteData.Loading
          },
          [
            dispatch =>
              SIP.register({
                protocol: 'wss',
                server: 'rl.arigativa.ru',
                port: 4443,
                register: true,
                username: state.username,
                onRegistration: result => dispatch(Register(result))
              })
          ]
        ])
      },

      Register: result =>
        result.cata<Stage>({
          Left: error =>
            Updated([
              {
                ...state,
                registration: RemoteData.Failure(error)
              },
              []
            ]),

          Right: userAgent =>
            Registered({ username: state.username, userAgent })
        })
    },
    action
  )
}

// V I E W

export const View: React.FC<{
  dispatch: Dispatch<Action>
  state: State
}> = ({ dispatch, state }) => {
  const busy = state.registration.isLoading()

  return (
    <div>
      <h1>Registration</h1>

      <form
        onSubmit={event => {
          dispatch(SignIn)
          event.preventDefault()
        }}
      >
        <input
          type="text"
          placeholder="Username"
          tabIndex={0}
          autoFocus
          readOnly={busy}
          value={state.username}
          onChange={event => dispatch(ChangeUsername(event.target.value))}
        />

        <button type="submit" disabled={busy} tabIndex={0}>
          Sign In
        </button>
      </form>

      {state.registration
        .mapFailure(message => (
          <p>
            <strong>Registration failed:</strong> {message}
          </p>
        ))
        .getOrElse(null)}
    </div>
  )
}
