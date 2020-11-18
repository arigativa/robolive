import React from 'react'

import { Dispatch, Cmd, caseOf, match } from 'core'
import * as Login from 'Login'
import * as RobotsList from 'RobotsList'

// S T A T E

export type State =
  | ReturnType<typeof LoginScreen>
  | ReturnType<typeof RobotsListScreen>

type ScreenWithUsername<T> = T & { username: string }

const LoginScreen = caseOf<'LoginScreen', Login.State>('LoginScreen')
const RobotsListScreen = caseOf<
  'RobotsListScreen',
  ScreenWithUsername<{
    robotsList: RobotsList.State
  }>
>('RobotsListScreen')

export const initial: State = LoginScreen(Login.initial)

// U P D A T E

export type Action =
  | ReturnType<typeof LoginAction>
  | ReturnType<typeof RobotsListAction>

const LoginAction = caseOf<'LoginAction', Login.Action>('LoginAction')
const RobotsListAction = caseOf<'RobotsListAction', RobotsList.Action>(
  'RobotsListAction'
)

export const update = (action: Action, state: State): [State, Cmd<Action>] => {
  return match(action, {
    LoginAction: subAction =>
      match<State, [State, Cmd<Action>]>(state, {
        LoginScreen: login =>
          match(Login.update(subAction, login), {
            Updated: nextLogin => [LoginScreen(nextLogin), Cmd.none],

            Registered: username => {
              const [robotsList, cmd] = RobotsList.init

              return [
                RobotsListScreen({ username, robotsList }),
                cmd.map(RobotsListAction)
              ]
            }
          }),

        _: () => [state, Cmd.none]
      }),

    RobotsListAction: subAction =>
      match<State, [State, Cmd<Action>]>(state, {
        RobotsListScreen: ({ username, robotsList }) => {
          const [nextRobotsList, cmd] = RobotsList.update(subAction, robotsList)

          return [
            RobotsListScreen({ username, robotsList: nextRobotsList }),
            cmd.map(RobotsListAction)
          ]
        },

        _: () => [state, Cmd.none]
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

const ViewRobotsList: React.FC<{
  robotsList: RobotsList.State
  dispatch: Dispatch<Action>
}> = ({ robotsList, dispatch }) => {
  const robotsListDispatch = React.useCallback(
    (action: RobotsList.Action) => dispatch(RobotsListAction(action)),
    [dispatch]
  )

  return <RobotsList.View state={robotsList} dispatch={robotsListDispatch} />
}

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = ({ state, dispatch }) => {
  return match(state, {
    LoginScreen: login => <ViewLogin login={login} dispatch={dispatch} />,

    RobotsListScreen: ({ robotsList }) => (
      <ViewRobotsList robotsList={robotsList} dispatch={dispatch} />
    )
  })
}
