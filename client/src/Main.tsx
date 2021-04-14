import React from 'react'

import { Dispatch, Cmd, Sub } from 'core'
import { Case } from 'utils'
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

export type Action =
  | Case<'InitRobotsList', string>
  | Case<'RobotsListAction', RobotsList.Action>
  | Case<'RoomAction', Room.Action>

const InitRobotsList = Case.of<Action, 'InitRobotsList'>('InitRobotsList')
const RobotsListAction = Case.of<Action, 'RobotsListAction'>('RobotsListAction')
const RoomAction = Case.of<Action, 'RoomAction'>('RoomAction')

const initRobotsList = (username: string): [State, Cmd<Action>] => {
  const [initialRobotsList, initialCmd] = RobotsList.init(username)

  return [
    RobotsListScreen({ username, robotsList: initialRobotsList }),
    initialCmd.map(RobotsListAction)
  ]
}

export const update = (action: Action, state: State): [State, Cmd<Action>] => {
  if (action.is(InitRobotsList)) {
    return initRobotsList(action.payload)
  }

  // R O B O T S   L I S T

  if (action.is(RobotsListAction) && state.is(RobotsListScreen)) {
    const { username, robotsList } = state.payload
    const stage = RobotsList.update(action.payload, username, robotsList)

    if (stage.is('Joined')) {
      const [initialRoom, initialCmd] = Room.init(stage.payload)

      return [
        RoomScreen({ username, room: initialRoom }),
        initialCmd.map(RoomAction)
      ]
    }

    const [nextRobotsList, cmd] = stage.payload

    return [
      RobotsListScreen({ username, robotsList: nextRobotsList }),
      cmd.map(RobotsListAction)
    ]
  }

  // R O O M

  if (action.is(RoomAction) && state.is(RoomScreen)) {
    const { username, room } = state.payload

    return Room.update(action.payload, room).match({
      Updated: ([nextRoom, cmd]) => [
        RoomScreen({ username, room: nextRoom }),
        cmd.map(RoomAction)
      ],

      BackToList: () => initRobotsList(username)
    })
  }

  // U N M A T C H E D

  return [state, Cmd.none]
}

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (state.is(RoomScreen)) {
    return Room.subscriptions(state.payload.room).map(RoomAction)
  }

  if (state.is(RobotsListScreen)) {
    return RobotsList.subscriptions(state.payload.robotsList).map(
      RobotsListAction
    )
  }

  return Sub.none
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
