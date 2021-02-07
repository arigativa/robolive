import React from 'react'
import RemoteData from 'frctl/RemoteData/Optional'
import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Button,
  Textarea
} from '@chakra-ui/react'

import { Dispatch, Cmd, Sub } from 'core'
import { RoomConfiguration } from 'api'
import { Connection, createConnection } from 'sip'
import { ActionOf, match } from 'utils'

// S T A T E

export interface State {
  connection: Connection
  stream: RemoteData<string, MediaStream>
  info: string
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
      stream: RemoteData.Loading,
      info: ''
    },
    connection.getStream(Connect)
  ]
}

// U P D A T E

export type Action = ActionOf<[State], [State, Cmd<Action>]>

const Connect = ActionOf<MediaStream, Action>((stream, state) => [
  {
    ...state,
    stream: RemoteData.Succeed(stream)
  },
  Cmd.none
])

const FailConnection = ActionOf<string, Action>((reason, state) => [
  {
    ...state,
    stream: RemoteData.Failure(reason)
  },
  Cmd.none
])

const EndCall = ActionOf<Action>(state => [
  {
    ...state,
    stream: RemoteData.NotAsked
  },
  Cmd.none
])()

const ChangeInfo = ActionOf<string, Action>((info, state) => [
  { ...state, info },
  Cmd.none
])

const SendInfo = ActionOf<Action>(state => [
  { ...state, info: '' },
  state.connection.sendInfo(state.info)
])()

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

const ViewSendInfo = React.memo<{
  info: string
  dispatch: Dispatch<Action>
}>(({ info, dispatch }) => (
  <form
    onSubmit={event => {
      dispatch(SendInfo)
      event.preventDefault()
    }}
  >
    <FormControl>
      <FormLabel>Send Info</FormLabel>

      <Textarea
        rows={10}
        resize="vertical"
        value={info}
        placeholder="Put info right here"
        onChange={event => dispatch(ChangeInfo(event.target.value))}
      />

      <FormHelperText>You can submit both plain text and JSON</FormHelperText>
    </FormControl>

    <Button mt="4" type="submit" colorScheme="blue">
      Submit
    </Button>
  </form>
))

const ViewSucceed = React.memo<{
  info: string
  stream: MediaStream
  dispatch: Dispatch<Action>
}>(({ info, stream, dispatch }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (videoRef.current != null) {
      videoRef.current.srcObject = stream.clone()
    }
  }, [stream])

  return (
    <Box p="4">
      <video ref={videoRef} autoPlay />

      <ViewSendInfo info={info} dispatch={dispatch} />
    </Box>
  )
})

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) =>
  state.stream.cata({
    NotAsked: () => <div>Call is ended</div>,

    Loading: () => <div>Loading...</div>,

    Failure: reason => <div>Something went wrong: {reason}</div>,

    Succeed: stream => (
      <ViewSucceed info={state.info} stream={stream} dispatch={dispatch} />
    )
  })
)
