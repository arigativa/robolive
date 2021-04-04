import React from 'react'
import Maybe from 'frctl/Maybe'
import {
  Container,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Heading,
  Button
} from '@chakra-ui/react'

import { Dispatch } from 'core'
import { ActionOf, CaseCreator, CaseOf, hasWhitespaces } from 'utils'
import * as TicTacToe from '../TicTacToe'

// S T A T E

export type State = {
  username: string
  error: Maybe<string>
  ttt: TicTacToe.State
}

export const initial: State = {
  username: '',
  error: Maybe.Nothing,
  ttt: TicTacToe.initial
}

// U P D A T E

export type Stage = CaseOf<'Updated', State> | CaseOf<'Registered', string>

const Updated: CaseCreator<Stage> = CaseOf('Updated')
const Registered: CaseCreator<Stage> = CaseOf('Registered')

export type Action = ActionOf<[State], Stage>

const SignIn = ActionOf<Action>(state => {
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
})()

const ChangeUsername = ActionOf<string, Action>((username, state) =>
  Updated({
    ...state,
    username
  })
)

const TicTacToeAction = ActionOf<TicTacToe.Action, Action>((tttAction, state) =>
  Updated({
    ...state,
    ttt: tttAction.update(state.ttt)
  })
)

// V I E W

const TicTacToeView = React.memo<{
  ttt: TicTacToe.State
  dispatch: Dispatch<Action>
}>(({ ttt, dispatch }) => {
  const tttDispatch = React.useCallback(
    (tttAction: TicTacToe.Action): void => {
      dispatch(TicTacToeAction(tttAction))
    },
    [dispatch]
  )

  return <TicTacToe.View state={ttt} dispatch={tttDispatch} />
})

export const View = React.memo<{
  dispatch: Dispatch<Action>
  state: State
}>(({ dispatch, state }) => (
  <Container>
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

    <TicTacToeView ttt={state.ttt} dispatch={dispatch} />
  </Container>
))
