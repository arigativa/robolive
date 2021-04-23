import React from 'react'

import { Dispatch, Cmd, Sub, useMapDispatch } from 'core'
import { Case } from 'utils'
import * as RobotsList from 'RobotsList'
import * as Room from 'Room'

// S T A T E

export type State =
  | Case<'AuthScreen'>
  | Case<'RobotsListScreen', { username: string; robotsList: RobotsList.State }>
  | Case<'RoomScreen', { username: string; robotId: string; room: Room.State }>

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
  if (action.type === 'InitRobotsList') {
    return initRobotsList(action.payload)
  }

  // R O B O T S   L I S T

  if (action.type === 'RobotsListAction' && state.type === 'RobotsListScreen') {
    const { username, robotsList } = state.payload

    return RobotsList.update(action.payload, username, robotsList).match({
      JoinToRoom: robotId => {
        const [initialRoom, initialCmd] = Room.init({ username, robotId })

        return [
          RoomScreen({ username, robotId, room: initialRoom }),
          initialCmd.map(RoomAction)
        ]
      },

      Updated: ([nextRobotsList, cmd]) => [
        RobotsListScreen({ username, robotsList: nextRobotsList }),
        cmd.map(RobotsListAction)
      ]
    })
  }

  // R O O M

  if (action.type === 'RoomAction' && state.type === 'RoomScreen') {
    const { username, robotId, room } = state.payload

    return Room.update(action.payload, { username, robotId }, room).match({
      Updated: ([nextRoom, cmd]) => [
        RoomScreen({ username, robotId, room: nextRoom }),
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
  if (state.type === 'RobotsListScreen') {
    return RobotsList.subscriptions(state.payload.robotsList).map(
      RobotsListAction
    )
  }

  if (state.type === 'RoomScreen') {
    return Room.subscriptions(state.payload.room).map(RoomAction)
  }

  return Sub.none
}

// V I E W

const ViewRobotsList = React.memo<{
  robotsList: RobotsList.State
  dispatch: Dispatch<Action>
}>(({ robotsList, dispatch }) => (
  <RobotsList.View
    state={robotsList}
    dispatch={useMapDispatch(RobotsListAction, dispatch)}
  />
))

const ViewRoom = React.memo<{
  room: Room.State
  dispatch: Dispatch<Action>
}>(({ room, dispatch }) => (
  <Room.View state={room} dispatch={useMapDispatch(RoomAction, dispatch)} />
))

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
