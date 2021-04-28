import React from 'react'

import { Dispatch, Cmd, Sub, useMapDispatch } from 'core'
import { Case } from 'utils'
import * as RobotsList from 'RobotsList'
import * as Room from 'Room'

// S T A T E

export type State =
  | Case<'AuthScreen'>
  | Case<'RobotsListScreen', { username: string; robotsList: RobotsList.State }>
  | Case<'RoomScreen', { credentials: Room.Credentials; room: Room.State }>

const AuthScreen = Case.of<State, 'AuthScreen'>('AuthScreen')()
const RobotsListScreen = Case.of<State, 'RobotsListScreen'>('RobotsListScreen')
const RoomScreen = Case.of<State, 'RoomScreen'>('RoomScreen')

export const initial: [State, Cmd<Action>] = [
  AuthScreen,
  Cmd.create<Action>(done => {
    done(InitRobotsList({ username: window.location.pathname.slice(1) }))
  })
]

// U P D A T E

export type Action =
  | Case<'InitRobotsList', { username: string }>
  | Case<'RobotsListAction', { action: RobotsList.Action }>
  | Case<'RoomAction', { action: Room.Action }>

const InitRobotsList = Case.of<Action, 'InitRobotsList'>('InitRobotsList')
const RobotsListAction = (action: RobotsList.Action): Action => ({
  type: 'RobotsListAction',
  action
})
const RoomAction = (action: Room.Action): Action => ({
  type: 'RoomAction',
  action
})

const initRobotsList = (username: string): [State, Cmd<Action>] => {
  const [initialRobotsList, initialCmd] = RobotsList.init(username)

  return [
    RobotsListScreen({ username, robotsList: initialRobotsList }),
    initialCmd.map(RobotsListAction)
  ]
}

export const update = (action: Action, state: State): [State, Cmd<Action>] => {
  if (action.type === 'InitRobotsList') {
    return initRobotsList(action.username)
  }

  // R O B O T S   L I S T

  if (action.type === 'RobotsListAction' && state.type === 'RobotsListScreen') {
    const stage = RobotsList.update(
      action.action,
      state.username,
      state.robotsList
    )

    if (stage.type === 'Updated') {
      return [
        {
          ...state,
          robotsList: stage.state
        },
        stage.cmd.map(RobotsListAction)
      ]
    }

    const credentials = { username: state.username, robotId: stage.robotId }
    const [initialRoom, initialCmd] = Room.init(credentials)

    return [
      RoomScreen({
        credentials,
        room: initialRoom
      }),
      initialCmd.map(RoomAction)
    ]
  }

  // R O O M

  if (action.type === 'RoomAction' && state.type === 'RoomScreen') {
    const stage = Room.update(action.action, state.credentials, state.room)

    if (stage.type === 'BackToList') {
      return initRobotsList(state.credentials.username)
    }

    return [
      {
        ...state,
        room: stage.state
      },
      stage.cmd.map(RoomAction)
    ]
  }

  // U N M A T C H E D

  return [state, Cmd.none]
}

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (state.type === 'RobotsListScreen') {
    return RobotsList.subscriptions(state.robotsList).map(RobotsListAction)
  }

  if (state.type === 'RoomScreen') {
    return Room.subscriptions(state.room).map(RoomAction)
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
  switch (state.type) {
    case 'AuthScreen': {
      return <RobotsList.Skeleton />
    }

    case 'RobotsListScreen': {
      return (
        <ViewRobotsList robotsList={state.robotsList} dispatch={dispatch} />
      )
    }

    case 'RoomScreen': {
      return <ViewRoom room={state.room} dispatch={dispatch} />
    }
  }
})
