import React from 'react'
import RemoteData from 'frctl/RemoteData'
import Either from 'frctl/Either'
import { Container } from '@chakra-ui/react'

import { Dispatch, Cmd, Sub, useMapDispatch } from 'core'
import { RoomConfiguration, joinRoom } from 'api'
import { createConnection, SipConnection } from 'sip'
import { Case } from 'utils'
import { AlertPanel } from 'AlertPanel'

import * as Room from './Room'

const IS_SECURE_SIP_CONNECTION =
  process.env.REACT_APP_IS_SECURE_SIP_CONNECTION === 'true'

export interface Credentials {
  username: string
  robotId: string
}

// S T A T E

export type State = RemoteData<
  string,
  { connection: SipConnection; room: Room.State }
>

export const init = (credentials: Credentials): [State, Cmd<Action>] => [
  RemoteData.Loading,
  Cmd.create<Action>(done => {
    joinRoom(credentials)
      .then(result => JoinToRoom({ result }))
      .then(done)
  })
]

// U P D A T E

export type Action =
  | Case<'JoinToRoom', { result: Either<string, RoomConfiguration> }>
  | Case<'RoomAction', { action: Room.Action }>

const JoinToRoom = Case.of<Action, 'JoinToRoom'>('JoinToRoom')
const RoomAction = (action: Room.Action): Action => ({
  type: 'RoomAction',
  action
})

export type Stage =
  | Case<'Updated', { state: State; cmd: Cmd<Action> }>
  | Case<'BackToList'>

const Updated = (state: State, cmd: Cmd<Action>): Stage => ({
  type: 'Updated',
  state,
  cmd
})
const BackToList = Case.of<Stage, 'BackToList'>('BackToList')()

export const update = (
  action: Action,
  credentials: Credentials,
  state: State
): Stage => {
  if (action.type === 'JoinToRoom') {
    return action.result.cata({
      Left: error => Updated(RemoteData.Failure(error), Cmd.none),

      Right: configuration => {
        const connection = createConnection({
          secure: IS_SECURE_SIP_CONNECTION,
          server: configuration.signallingUri,
          agent: configuration.sipAgentName,
          client: configuration.sipClientName,
          iceServers: [configuration.stunUri, configuration.turnUri]
        })

        return Updated(
          RemoteData.Succeed({
            connection,
            room: Room.initialState
          }),
          Room.initCmd(connection, credentials).map(RoomAction)
        )
      }
    })
  }

  return state.cata({
    Succeed: ({ connection, room }) => {
      const stage = Room.update(action.action, credentials, connection, room)

      if (stage.type === 'BackToList') {
        return BackToList
      }

      return Updated(
        RemoteData.Succeed({ connection, room: stage.state }),
        stage.cmd.map(RoomAction)
      )
    },

    _: () => Updated(state, Cmd.none)
  })
}

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  return state
    .map(({ connection, room }) => {
      return Room.subscriptions(connection, room).map(RoomAction)
    })
    .getOrElse(Sub.none)
}

// V I E W

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => {
  const roomDispatch = useMapDispatch(RoomAction, dispatch)

  return (
    <Container py="4">
      {state.cata({
        Loading: () => (
          <Room.View state={Room.initialState} dispatch={roomDispatch} />
        ),

        Failure: message => (
          <AlertPanel status="error" title="Request Error!">
            {message}
          </AlertPanel>
        ),

        Succeed: ({ room }) => (
          <Room.View state={room} dispatch={roomDispatch} />
        )
      })}
    </Container>
  )
})
