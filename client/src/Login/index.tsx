import React from 'react'
import Maybe from 'frctl/Maybe'
import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Heading,
  Button
} from '@chakra-ui/react'

import { Dispatch, caseOf, match } from 'core'
import { hasWhitespaces } from 'utils'

// S T A T E

export type State = {
  username: string
  error: Maybe<string>
}

export const initial: State = {
  username: '',
  error: Maybe.Nothing
}

// U P D A T E

export type Action = ReturnType<typeof ChangeUsername> | typeof SignIn

const SignIn = caseOf('SignIn')()
const ChangeUsername = caseOf<'ChangeUsername', string>('ChangeUsername')

export type Stage = ReturnType<typeof Updated> | ReturnType<typeof Registered>

const Updated = caseOf<'Updated', State>('Updated')
const Registered = caseOf<'Registered', string>('Registered')

export const update = (action: Action, state: State): Stage => {
  return match<Action, Stage>(action, {
    ChangeUsername: username => {
      return Updated({
        ...state,
        username
      })
    },

    SignIn: () => {
      if (hasWhitespaces(state.username)) {
        return Updated({
          ...state,
          error: Maybe.Just('Username must have no white spaces')
        })
      }

      if (state.username.length === 0) {
        return Updated({
          ...state,
          error: Maybe.Just('Username must be not empty')
        })
      }

      return Registered(state.username)
    }
  })
}

// V I E W

export const View: React.FC<{
  dispatch: Dispatch<Action>
  state: State
}> = ({ dispatch, state }) => (
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
          value={state.username}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            dispatch(ChangeUsername(event.target.value))
          }
        />

        {state.error.fold(
          () => null,
          message => (
            <FormHelperText color="red.300">
              <strong>Registration failed:</strong> {message}
            </FormHelperText>
          )
        )}
      </FormControl>

      <Button mt={4} colorScheme="blue" type="submit" tabIndex={0}>
        Sign In
      </Button>
    </form>
  </Box>
)
