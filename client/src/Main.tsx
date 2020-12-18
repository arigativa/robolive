import React from 'react'

import { ActionOf, Dispatch, Cmd, Sub, caseOf, match } from 'core'
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

export type Action = ActionOf<[State], [State, Cmd<Action>]>

const LoginAction = ActionOf<Login.Action, Action>((action, state) =>
  match<State, [State, Cmd<Action>]>(state, {
    LoginScreen: login =>
      match(action.update(login), {
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
  })
)

const RobotsListAction = ActionOf<RobotsList.Action, Action>((action, state) =>
  match<State, [State, Cmd<Action>]>(state, {
    RobotsListScreen: ({ username, robotsList }): [State, Cmd<Action>] => {
      const [nextRobotsList, cmd] = action.update(robotsList)

      return [
        RobotsListScreen({
          username,
          robotsList: nextRobotsList
        }),
        cmd.map(RobotsListAction)
      ]
    },

    _: () => [state, Cmd.none]
  })
)

// S U B S C R I P T I O N S

export const subscriptions = (_state: State): Sub<Action> => {
  return Sub.none
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
  mapAction(action: RobotsList.Action): Action
}> = React.memo(({ robotsList, dispatch, mapAction }) => {
  const robotsListDispatch = React.useCallback(
    (action: RobotsList.Action) => dispatch(mapAction(action)),
    [dispatch, mapAction]
  )

  return <RobotsList.View state={robotsList} dispatch={robotsListDispatch} />
})

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = ({ state, dispatch }) => {
  return match(state, {
    LoginScreen: login => <ViewLogin login={login} dispatch={dispatch} />,

    RobotsListScreen: ({ robotsList }) => (
      <ViewRobotsList
        robotsList={robotsList}
        mapAction={RobotsListAction}
        dispatch={dispatch}
      />
    )
  })
}
