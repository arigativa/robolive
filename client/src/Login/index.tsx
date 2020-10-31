import React from 'react'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData/Optional'
import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Heading,
  Button
} from '@chakra-ui/core'

import { Dispatch, Effects, caseOf, match } from 'core'
import * as SIP from 'sip'
import { SIP_PROTOCOL, SIP_SERVER, SIP_PORT } from 'env'
import { Credentials } from 'credentials'
import { hasWhitespaces } from 'utils'

// S T A T E

export type State = {
  username: string
  registration: RemoteData<string, never>
}

export const initial: State = {
  username: '',
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
  return match<Action, Stage>(action, {
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
              protocol: SIP_PROTOCOL,
              server: SIP_SERVER,
              port: SIP_PORT,
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

        Right: userAgent => Registered({ username: state.username, userAgent })
      })
  })
}

// V I E W

export const View: React.FC<{
  dispatch: Dispatch<Action>
  state: State
}> = ({ dispatch, state }) => {
  const busy = state.registration.isLoading()

  return (
    <Box p={4}>
      <Heading>Registration</Heading>

      <form
        onSubmit={event => {
          dispatch(SignIn)
          event.preventDefault()
        }}
      >
        <FormControl mt={4}>
          <FormLabel htmlFor="username">Username</FormLabel>

          <Input
            type="text"
            placeholder="Username"
            tabIndex={0}
            autoFocus
            isReadOnly={busy}
            value={state.username}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              dispatch(ChangeUsername(event.target.value))
            }
          />

          {state.registration
            .swap()
            .toMaybe()
            .fold(
              () => null,
              message => (
                <FormHelperText color="red.300">
                  <strong>Registration failed:</strong> {message}
                </FormHelperText>
              )
            )}
        </FormControl>

        <Button
          mt={4}
          variantColor="blue"
          type="submit"
          isDisabled={busy}
          tabIndex={0}
        >
          Sign In
        </Button>
      </form>
    </Box>
  )
}
