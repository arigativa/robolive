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

export const initRobotsList: (username: string) => [State, Cmd<Action>] = (
  username: string
) => {
  const [initialRobotsList, initialCmd] = RobotsList.init(username)

  return [
    RobotsListScreen({ username: username, robotsList: initialRobotsList }),
    initialCmd.map(RobotsListAction)
  ]
}

const SetPathAction = ActionOf<string, Action>(
  (username: string, state: State): [State, Cmd<Action>] => {
    switch (state.type) {
      case 'RobotsListScreen': {
        const nextState = RobotsListScreen({
          ...state.payload,
          username: username
        })

        return [nextState, RobotsList.init(username)[1].map(RobotsListAction)]
      }

      default:
        return [state, Cmd.none]
    }
  }
)

export const initial: [State, Cmd<Action>] = [
  RobotsListScreen({
    username: '',
    robotsList: RobotsList.init('')[0]
  }),
  Cmd.create<string>(done => {
    done(window.location.pathname.slice(1))
  }).map(username => SetPathAction(username))
]

const RobotsListAction: (payload: RobotsList.Action) => Action = ActionOf<
  RobotsList.Action,
  Action
>((action: RobotsList.Action, state: State): [State, Cmd<Action>] => {
  switch (state.type) {
    case 'RobotsListScreen': {
      const robotListState = action.update(
        state.payload.username,
        state.payload.robotsList
      )
      switch (robotListState.type) {
        case 'Joined': {
          const [initialRoom, initialCmd] = Room.init(robotListState.payload)

          return [
            RoomScreen({
              username: state.payload.username,
              room: initialRoom
            }),
            initialCmd.map(RoomAction)
          ]
        }

        case 'Updated': {
          const [updatedState, cmd] = robotListState.payload

          return [
            RobotsListScreen({
              username: state.payload.username,
              robotsList: updatedState
            }),
            cmd.map(RobotsListAction)
          ]
        }

        default:
          return [state, Cmd.none]
      }
    }

    default:
      return [state, Cmd.none]
  }
})

const RoomAction = ActionOf<Room.Action, Action>((action, state) =>
  match<State, [State, Cmd<Action>]>(state, {
    RoomScreen: ({ username, room }): [State, Cmd<Action>] => {
      return match(action.update(room), {
        Updated: ([nextRoom, cmd]) => [
          RoomScreen({ username, room: nextRoom }),
          cmd.map(RoomAction)
        ],

        BackToList: () => initRobotsList(username)
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
