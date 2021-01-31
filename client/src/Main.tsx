import React from 'react'

import { Dispatch, Cmd, Sub } from 'core'
import { ActionOf, CaseOf, CaseCreator, match } from 'utils'
import * as Login from 'Login'
import * as RobotsList from 'RobotsList'
import * as Room from 'Room'

// S T A T E

export type State =
  | CaseOf<'LoginScreen', Login.State>
  | CaseOf<
      'RobotsListScreen',
      ScreenWithUsername<{ robotsList: RobotsList.State }>
    >
  | CaseOf<'RoomScreen', Room.State>

type ScreenWithUsername<T> = T & { username: string }

const LoginScreen: CaseCreator<State> = CaseOf('LoginScreen')
const RobotsListScreen: CaseCreator<State> = CaseOf('RobotsListScreen')
const RoomScreen: CaseCreator<State> = CaseOf('RoomScreen')

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
      return match(action.update(username, robotsList), {
        Updated: ([nextRobotsList, cmd]) => [
          RobotsListScreen({
            username,
            robotsList: nextRobotsList
          }),
          cmd.map(RobotsListAction)
        ],

        Joined: configuration => {
          const [initialRoom, initialCmd] = Room.init(configuration)

          return [RoomScreen(initialRoom), initialCmd.map(RoomAction)]
        }
      })
    },

    _: () => [state, Cmd.none]
  })
)

const RoomAction = ActionOf<Room.Action, Action>((action, state) =>
  match<State, [State, Cmd<Action>]>(state, {
    RoomScreen: room => [RoomScreen(action.update(room)), Cmd.none],

    _: () => [state, Cmd.none]
  })
)

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  return match<State, Sub<Action>>(state, {
    RoomScreen: room => Room.subscriptions(room).map(RoomAction),

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
    ),

    RoomScreen: room => <Room.View state={room} />
  })
}
