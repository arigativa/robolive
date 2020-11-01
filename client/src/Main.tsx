import React from 'react'

import { Dispatch, Effects, caseOf, match, mapEffects } from 'core'
import * as Login from 'Login'

// S T A T E

type Screen = ReturnType<typeof LoginScreen> | ReturnType<typeof RoomScreen>

const LoginScreen = caseOf<'LoginScreen', Login.State>('LoginScreen')
const RoomScreen = caseOf<'RoomScreen', string>('RoomScreen')

export type State = {
  screen: Screen
}

export const initial: State = {
  screen: LoginScreen(Login.initial)
}

// U P D A T E

export type Action = ReturnType<typeof LoginAction>

const LoginAction = caseOf<'LoginAction', Login.Action>('LoginAction')

export const update = (
  action: Action,
  state: State
): [State, Effects<Action>] => {
  return match(action, {
    LoginAction: subAction =>
      match<Screen, [State, Effects<Action>]>(state.screen, {
        LoginScreen: login =>
          match(Login.update(subAction, login), {
            Updated: nextLogin => [
              {
                ...state,
                screen: LoginScreen(nextLogin)
              },
              []
            ],

            Registered: () => [{ screen: RoomScreen('asd') }, []]
          }),

        _: () => [state, []]
      })
  })
}

// V I E W

const ViewLogin: React.FC<{
  login: Login.State
  dispatch: Dispatch<Action>
}> = ({ login, dispatch }) => {
  const loginDispatch = React.useCallback(
    (action: Login.Action) => dispatch(LoginAction(action)),
    [dispatch]
  )

  return <Login.View state={login} dispatch={loginDispatch} />
}

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = ({ state, dispatch }) => {
  return match(state.screen, {
    LoginScreen: login => <ViewLogin login={login} dispatch={dispatch} />,

    RoomScreen: name => <h1>{name}</h1>
  })
}
