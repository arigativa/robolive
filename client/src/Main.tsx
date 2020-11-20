import React from 'react'

import { Dispatch, Cmd, Sub, caseOf, match } from 'core'
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
    robotsList2: RobotsList.State
  }>
>('RobotsListScreen')

export const initial: State = LoginScreen(Login.initial)

// U P D A T E

export type Action =
  | ReturnType<typeof LoginAction>
  | ReturnType<typeof RobotsListAction>
  | ReturnType<typeof RobotsListAction2>

const LoginAction = caseOf<'LoginAction', Login.Action>('LoginAction')
const RobotsListAction = caseOf<'RobotsListAction', RobotsList.Action>(
  'RobotsListAction'
)
const RobotsListAction2 = caseOf<'RobotsListAction2', RobotsList.Action>(
  'RobotsListAction2'
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
                RobotsListScreen({
                  username,
                  robotsList,
                  robotsList2: robotsList
                }),
                Cmd.batch<Action>([
                  cmd.map(RobotsListAction),
                  cmd.map(RobotsListAction2)
                ])
              ]
            }
          }),

        _: () => [state, Cmd.none]
      }),

    RobotsListAction: subAction =>
      match<State, [State, Cmd<Action>]>(state, {
        RobotsListScreen: ({ username, robotsList, robotsList2 }) => {
          const [nextRobotsList, cmd] = RobotsList.update(subAction, robotsList)

          return [
            RobotsListScreen({
              username,
              robotsList2,
              robotsList: nextRobotsList
            }),
            cmd.map(RobotsListAction)
          ]
        },

        _: () => [state, Cmd.none]
      }),

    RobotsListAction2: subAction =>
      match<State, [State, Cmd<Action>]>(state, {
        RobotsListScreen: ({ username, robotsList2, robotsList }) => {
          const [nextRobotsList, cmd] = RobotsList.update(
            subAction,
            robotsList2
          )

          return [
            RobotsListScreen({
              username,
              robotsList2: nextRobotsList,
              robotsList
            }),
            cmd.map(RobotsListAction2)
          ]
        },

        _: () => [state, Cmd.none]
      })
  })
}

// S U B S C R I P T I O N

export const subscription = (state: State): Sub<Action> => {
  return match<State, Sub<Action>>(state, {
    RobotsListScreen: ({ robotsList, robotsList2 }) => {
      return Sub.batch<Action>([
        RobotsList.subscription(robotsList).map(RobotsListAction),
        RobotsList.subscription(robotsList2).map(RobotsListAction2)
      ])
    },

    _: () => Sub.none
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
  mapAction(action: RobotsList.Action): Action
}> = ({ robotsList, dispatch, mapAction }) => {
  const robotsListDispatch = React.useCallback(
    (action: RobotsList.Action) => dispatch(mapAction(action)),
    [dispatch, mapAction]
  )

  return <RobotsList.View state={robotsList} dispatch={robotsListDispatch} />
}

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = ({ state, dispatch }) => {
  return match(state, {
    LoginScreen: login => <ViewLogin login={login} dispatch={dispatch} />,

    RobotsListScreen: ({ robotsList, robotsList2 }) => (
      <div>
        <ViewRobotsList
          robotsList={robotsList}
          mapAction={RobotsListAction}
          dispatch={dispatch}
        />
        <ViewRobotsList
          robotsList={robotsList2}
          mapAction={RobotsListAction2}
          dispatch={dispatch}
        />
      </div>
    )
  })
}
