import React from 'react'

import { Dispatch, Cmd, Sub } from 'core'
import { ActionOf, CaseOf, CaseCreator, match } from 'utils'
import * as RobotsList from 'RobotsList'
import * as Room from 'Room'

// S T A T E

export type State =
  | CaseOf<
      'RobotsListScreen',
      ScreenWithUsername<{ robotsList: RobotsList.State }>
    >
  | CaseOf<'RoomScreen', ScreenWithUsername<{ room: Room.State }>>

type ScreenWithUsername<T> = T & { username: string }

const RobotsListScreen: CaseCreator<State> = CaseOf('RobotsListScreen')
const RoomScreen: CaseCreator<State> = CaseOf('RoomScreen')

// U P D A T E

export type Action = ActionOf<[State], [State, Cmd<Action>]>

export const initRobotsList: () => [State, Cmd<Action>] = () => {
  const [initialRobotsList, initialCmd] = RobotsList.init

  return [
    RobotsListScreen({ username: '', robotsList: initialRobotsList }),
    initialCmd.map(RobotsListAction)
  ]
}

const RobotsListAction = ActionOf<RobotsList.Action, Action>((action, state) =>
  match<State, [State, Cmd<Action>]>(state, {
    RobotsListScreen: ({ username, robotsList }): [State, Cmd<Action>] => {
      return match(action.update(username, robotsList), {
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
    },

    _: () => [state, Cmd.none]
  })
)

const RoomAction = ActionOf<Room.Action, Action>((action, state) =>
  match<State, [State, Cmd<Action>]>(state, {
    RoomScreen: ({ username, room }): [State, Cmd<Action>] => {
      return match(action.update(room), {
        Updated: ([nextRoom, cmd]) => [
          RoomScreen({ username, room: nextRoom }),
          cmd.map(RoomAction)
        ],

        BackToList: () => initRobotsList()
      })
    },

    _: () => [state, Cmd.none]
  })
)

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  return match<State, Sub<Action>>(state, {
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
  return match(state, {
    RobotsListScreen: ({ robotsList }) => (
      <ViewRobotsList robotsList={robotsList} dispatch={dispatch} />
    ),

    RoomScreen: ({ room }) => <ViewRoom room={room} dispatch={dispatch} />
  })
})
