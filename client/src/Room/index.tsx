import React from 'react'

import RemoteData from 'frctl/RemoteData/Optional'

import { Sub } from 'core'
import { RoomConfiguration } from 'api'
import { callRTC } from 'sip'
import { ActionOf } from 'utils'

// S T A T E

export interface State {
  configuration: RoomConfiguration
  stream: RemoteData<string, MediaStream>
}

export const init = (configuration: RoomConfiguration): State => ({
  configuration,
  stream: RemoteData.Loading
})

// U P D A T E

export type Action = ActionOf<[State], State>

const Connect = ActionOf<MediaStream, Action>((stream, state) => {
  return {
    ...state,
    stream: RemoteData.Succeed(stream)
  }
})

const FailConnection = ActionOf<string, Action>((reason, state) => {
  return {
    ...state,
    stream: RemoteData.Failure(reason)
  }
})

const EndCall = ActionOf<Action>(state => {
  return {
    ...state,
    stream: RemoteData.NotAsked
  }
})()

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (state.stream.isNotAsked() || state.stream.isFailure()) {
    return Sub.none
  }

  return callRTC({
    secure: true,
    server: state.configuration.signallingUri,
    agent: state.configuration.sipAgentName,
    client: state.configuration.sipClientName,
    withAudio: false,
    withVideo: true,
    iceServers: [state.configuration.stunUri, state.configuration.turnUri],
    onConnect: Connect,
    onFailure: FailConnection,
    onEnd: EndCall
  })
}

// V I E W

export const View: React.FC<{ state: State }> = ({ state }) =>
  state.stream.cata({
    NotAsked: () => <div>Call is ended</div>,

    Loading: () => <div>Loading...</div>,

    Failure: reason => <div>Something went wrong: {reason}</div>,

    Succeed: stream => (
      <div>
        IT WORKS!
        <video autoPlay src={(stream as unknown) as string} />
      </div>
    )
  })