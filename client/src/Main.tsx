import React from 'react'

import { Dispatch, Cmd, Sub } from 'core'
import { ActionOf, Case } from 'utils'
import * as RobotsList from 'RobotsList'
import * as Room from 'Room'

// S T A T E

export type State =
  | Case<'AuthScreen'>
  | Case<
      'RobotsListScreen',
      ScreenWithUsername<{ robotsList: RobotsList.State }>
    >
  | Case<'RoomScreen', ScreenWithUsername<{ room: Room.State }>>

type ScreenWithUsername<T> = T & { username: string }

const AuthScreen = Case.of<State, 'AuthScreen'>('AuthScreen')()
const RobotsListScreen = Case.of<State, 'RobotsListScreen'>('RobotsListScreen')
const RoomScreen = Case.of<State, 'RoomScreen'>('RoomScreen')

export const initial: [State, Cmd<Action>] = [
  AuthScreen,
  Cmd.create<Action>(done => {
    done(InitRobotsList(window.location.pathname.slice(1)))
  })
]

// U P D A T E

export type Action = ActionOf<[State], [State, Cmd<Action>]>

const InitRobotsList = ActionOf<string, Action>(username => {
  const [initialRobotsList, initialCmd] = RobotsList.init(username)

  return [
    RobotsListScreen({ username, robotsList: initialRobotsList }),
    initialCmd.map(RobotsListAction)
  ]
})

const RobotsListAction = ActionOf<RobotsList.Action, Action>((action, state): [
  State,
  Cmd<Action>
] => {
  if (!state.is(RobotsListScreen)) {
    return [state, Cmd.none]
  }

  const { username, robotsList } = state.payload

  return RobotsList.update(action, username, robotsList).match<
    [State, Cmd<Action>]
  >({
    Updated: ([nextRobotsList, cmd]) => [
      RobotsListScreen({ username, robotsList: nextRobotsList }),
      cmd.map(RobotsListAction)
    ],

    Joined: configuration => {
      const [initialRoom, initialCmd] = Room.init(configuration)

      return [
        RoomScreen({ username, room: initialRoom }),
        initialCmd.map(RoomAction)
      ]
    }
  })
})

const RoomAction = ActionOf<Room.Action, Action>((action, state): [
  State,
  Cmd<Action>
] => {
  if (!state.is(RoomScreen)) {
    return [state, Cmd.none]
  }

  const { username, room } = state.payload

  return Room.update(action, room).match({
    Updated: ([nextRoom, cmd]) => [
      RoomScreen({ username, room: nextRoom }),
      cmd.map(RoomAction)
    ],

    BackToList: () => InitRobotsList(username).update(state)
  })
})

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  return state.match({
    RoomScreen: ({ room }) => {
      return Room.subscriptions(room).map(RoomAction)
    },

    RobotsListScreen: ({ robotsList }) => {
      return RobotsList.subscriptions(robotsList).map(RobotsListAction)
    },

    _: () => Sub.none
  })
}

// V I E W

const ViewRobotsList = React.memo<{
  robotsList: RobotsList.State
  dispatch: Dispatch<Action>
}>(({ robotsList, dispatch }) => {
  const robotsListDispatch = React.useCallback(
    (action: RobotsList.Action) => dispatch(RobotsListAction(action)),
    [dispatch]
  )

  return <RobotsList.View state={robotsList} dispatch={robotsListDispatch} />
})

const ViewRoom = React.memo<{
  room: Room.State
  dispatch: Dispatch<Action>
}>(({ room, dispatch }) => {
  const roomDispatch = React.useCallback(
    (action: Room.Action) => dispatch(RoomAction(action)),
    [dispatch]
  )

  return <Room.View state={room} dispatch={roomDispatch} />
})

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => {
  return state.match({
    AuthScreen: () => <RobotsList.Skeleton />,

    RobotsListScreen: ({ robotsList }) => (
      <ViewRobotsList robotsList={robotsList} dispatch={dispatch} />
    ),

    RoomScreen: ({ room }) => <ViewRoom room={room} dispatch={dispatch} />
  })
})
