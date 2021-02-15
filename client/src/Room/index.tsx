import React from 'react'
import styled from '@emotion/styled'
import RemoteData from 'frctl/RemoteData/Optional'
import {
  Container,
  Stack,
  StackItem,
  FormControl,
  FormLabel,
  FormHelperText,
  Button,
  Textarea
} from '@chakra-ui/react'

import { Dispatch, Cmd, Sub } from 'core'
import { RoomConfiguration } from 'api'
import { Connection, createConnection } from 'sip'
import { ActionOf, CaseOf, CaseCreator, match } from 'utils'

// S T A T E

export interface State {
  connection: Connection
  stream: RemoteData<string, MediaStream>
  info: string
  terminating: boolean
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
      info: '',
      terminating: false
    },
    connection.getStream(Connect)
  ]
}

// U P D A T E

export type Action = ActionOf<[State], Stage>

export type Stage =
  | CaseOf<'Updated', [State, Cmd<Action>]>
  | CaseOf<'BackToList'>

const Updated: CaseCreator<Stage> = CaseOf('Updated')
const BackToList: Stage = CaseOf('BackToList')()

const Connect = ActionOf<MediaStream, Action>((stream, state) =>
  Updated([
    {
      ...state,
      stream: RemoteData.Succeed(stream)
    },
    Cmd.none
  ])
)

const FailConnection = ActionOf<string, Action>((reason, state) =>
  Updated([
    {
      ...state,
      stream: RemoteData.Failure(reason)
    },
    Cmd.none
  ])
)

const EndCall = ActionOf<Action>(state => {
  return Updated([
    {
      ...state,
      stream: RemoteData.NotAsked
    },
    state.terminating
      ? Cmd.create<Action>(done => {
          // gives some time for robot to change status
          setTimeout(() => done(GoToRobotsList), 100)
        })
      : Cmd.none
  ])
})()

const ChangeInfo = ActionOf<string, Action>((info, state) =>
  Updated([
    {
      ...state,
      info
    },
    Cmd.none
  ])
)

const SendInfo = ActionOf<Action>(state =>
  Updated([
    {
      ...state,
      info: ''
    },
    state.connection.sendInfo(state.info)
  ])
)()

const Terminate = ActionOf<Action>(state =>
  Updated([
    {
      ...state,
      terminating: true
    },
    state.connection.terminate
  ])
)()

const GoToRobotsList = ActionOf<Action>(() => BackToList)()

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

const ViewCallOver = React.memo<{
  dispatch: Dispatch<Action>
}>(({ dispatch }) => (
  <>
    Call is ended.
    <Button
      ml="2"
      variant="link"
      colorScheme="teal"
      onClick={() => dispatch(GoToRobotsList)}
    >
      Go back to Robots List
    </Button>
  </>
))

const ViewFailure = React.memo<{
  reason: string
  dispatch: Dispatch<Action>
}>(({ reason, dispatch }) => (
  <Stack>
    <StackItem>Something went wrong: {reason}</StackItem>

    <StackItem>
      <Button
        ml="2"
        variant="link"
        colorScheme="teal"
        onClick={() => dispatch(GoToRobotsList)}
      >
        Go back to Robots List
      </Button>
    </StackItem>
  </Stack>
))

const StyledTextarea = styled(Textarea)`
  font-family: 'Open sans', monospace;
`

const ViewSendInfo = React.memo<{
  info: string
  dispatch: Dispatch<Action>
}>(({ info, dispatch }) => (
  <Stack
    as="form"
    onSubmit={event => {
      dispatch(SendInfo)
      event.preventDefault()
    }}
  >
    <StackItem>
      <FormControl>
        <FormLabel>Send Info</FormLabel>

        <StyledTextarea
          rows={10}
          resize="vertical"
          value={info}
          placeholder="Put info right here"
          onChange={event => dispatch(ChangeInfo(event.target.value))}
        />

        <FormHelperText>You can submit both plain text and JSON</FormHelperText>
      </FormControl>
    </StackItem>

    <StackItem>
      <Button type="submit" colorScheme="teal">
        Submit
      </Button>
    </StackItem>
  </Stack>
))

const ViewSucceed = React.memo<{
  info: string
  terminating: boolean
  stream: MediaStream
  dispatch: Dispatch<Action>
}>(({ info, terminating, stream, dispatch }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (videoRef.current != null) {
      videoRef.current.srcObject = stream.clone()
    }
  }, [stream])

  return (
    <Stack>
      <StackItem>
        <Button
          variant="link"
          colorScheme="teal"
          isDisabled={terminating}
          onClick={() => dispatch(Terminate)}
        >
          Back to Robots List
        </Button>
      </StackItem>

      <StackItem>
        <video ref={videoRef} autoPlay />
      </StackItem>

      <StackItem>
        <ViewSendInfo info={info} dispatch={dispatch} />
      </StackItem>
    </Stack>
  )
})

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => (
  <Container>
    {state.stream.cata({
      NotAsked: () => <ViewCallOver dispatch={dispatch} />,

      Loading: () => <div>Loading...</div>,

      Failure: reason => <ViewFailure reason={reason} dispatch={dispatch} />,

      Succeed: stream => (
        <ViewSucceed
          info={state.info}
          terminating={state.terminating}
          stream={stream}
          dispatch={dispatch}
        />
      )
    })}
  </Container>
))
