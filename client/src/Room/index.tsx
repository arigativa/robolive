import React from 'react'

import RemoteData from 'frctl/RemoteData/Optional'

import { Cmd, Sub } from 'core'
import { RoomConfiguration } from 'api'
import { Connection, createConnection } from 'sip'
import { ActionOf, match } from 'utils'

// S T A T E

export interface State {
  connection: Connection
  stream: RemoteData<string, MediaStream>
}

export const init = (
  configuration: RoomConfiguration
): [State, Cmd<Action>] => {
  const connection = createConnection({
    secure: true,
    server: configuration.signallingUri,
    agent: configuration.sipAgentName,
    client: configuration.sipClientName,
    iceServers: [configuration.stunUri, configuration.turnUri]
  })

  return [
    {
      connection,
      stream: RemoteData.Loading
    },
    connection.getStream(Connect)
  ]
}

// U P D A T E

export type Action = ActionOf<[State], State>

const Connect = ActionOf<MediaStream, Action>((stream, state) => ({
  ...state,
  stream: RemoteData.Succeed(stream)
}))

const FailConnection = ActionOf<string, Action>((reason, state) => ({
  ...state,
  stream: RemoteData.Failure(reason)
}))

const EndCall = ActionOf<Action>(state => ({
  ...state,
  stream: RemoteData.NotAsked
}))()

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (state.stream.isNotAsked() || state.stream.isFailure()) {
    return Sub.none
  }

  return state.connection.listen(event =>
    match(event, {
      OnFailure: FailConnection,
      OnEnd: () => EndCall
    })
  )
}

// V I E W

const ViewSucceed = React.memo<{
  stream: MediaStream
}>(({ stream }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (videoRef.current != null) {
      videoRef.current.srcObject = stream.clone()
    }
  }, [stream])

  return (
    <div>
      IT WORKS!
      <video ref={videoRef} autoPlay />
    </div>
  )
})

export const View = React.memo<{
  state: State
}>(({ state }) =>
  state.stream.cata({
    NotAsked: () => <div>Call is ended</div>,

    Loading: () => <div>Loading...</div>,

    Failure: reason => <div>Something went wrong: {reason}</div>,

    Succeed: stream => <ViewSucceed stream={stream} />
  })
)
