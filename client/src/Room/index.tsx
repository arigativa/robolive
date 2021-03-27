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
  Checkbox,
  Button,
  Textarea
} from '@chakra-ui/react'

import { Dispatch, Cmd, Sub } from 'core'
import { RoomConfiguration } from 'api'
import { Connection, createConnection } from 'sip'
import { ActionOf, CaseOf, CaseCreator } from 'utils'

// S T A T E

const IS_SECURE_SIP_CONNECTION =
  process.env.REACT_APP_IS_SECURE_SIP_CONNECTION === 'true'

export interface State {
  connection: Connection
  stream: RemoteData<string, MediaStream>
  info: string
  terminating: boolean
  saveOnSubmit: boolean
}

export const init = (
  configuration: RoomConfiguration
): [State, Cmd<Action>] => {
  const connection = createConnection({
    secure: IS_SECURE_SIP_CONNECTION,
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
      terminating: false,
      saveOnSubmit: true
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
      info: state.saveOnSubmit ? state.info : ''
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

const SetSaveOnSubmit = ActionOf<boolean, Action>((saveOnSubmit, state) =>
  Updated([
    {
      ...state,
      saveOnSubmit
    },
    Cmd.none
  ])
)

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (state.stream.isNotAsked() || state.stream.isFailure()) {
    return Sub.none
  }

  return Sub.batch([
    state.connection.onEnd(GoToRobotsList),
    state.connection.onFailure(FailConnection)
  ])
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

const useFakeSubmitting = (ms: number): [boolean, VoidFunction] => {
  const [submitting, setSubmitting] = React.useState(false)
  const fakeSubmitting = React.useCallback(() => setSubmitting(true), [])

  React.useEffect(() => {
    if (submitting) {
      const timeoutId = setTimeout(() => {
        setSubmitting(false)
      }, ms)

      return () => clearTimeout(timeoutId)
    }
  }, [ms, submitting])

  return [submitting, fakeSubmitting]
}

const ViewSendInfo = React.memo<{
  info: string
  saveOnSubmit: boolean
  dispatch: Dispatch<Action>
}>(({ info, saveOnSubmit, dispatch }) => {
  const [submitting, fakeSubmitting] = useFakeSubmitting(400)

  return (
    <Stack
      as="form"
      onSubmit={event => {
        fakeSubmitting()
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

          <FormHelperText>
            You can submit both plain text and JSON
          </FormHelperText>
        </FormControl>
      </StackItem>

      <StackItem>
        <Stack direction="row" align="center" spacing="4">
          <StackItem>
            <Button type="submit" colorScheme="teal" isLoading={submitting}>
              Submit
            </Button>
          </StackItem>

          <StackItem>
            <Checkbox
              colorScheme="teal"
              isChecked={saveOnSubmit}
              isReadOnly={submitting}
              onChange={event =>
                dispatch(SetSaveOnSubmit(event.target.checked))
              }
            >
              Save on submit
            </Checkbox>
          </StackItem>
        </Stack>
      </StackItem>
    </Stack>
  )
})

const ViewSucceed = React.memo<{
  info: string
  terminating: boolean
  saveOnSubmit: boolean
  stream: MediaStream
  dispatch: Dispatch<Action>
}>(({ info, terminating, saveOnSubmit, stream, dispatch }) => {
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
        <ViewSendInfo
          info={info}
          saveOnSubmit={saveOnSubmit}
          dispatch={dispatch}
        />
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
          saveOnSubmit={state.saveOnSubmit}
          stream={stream}
          dispatch={dispatch}
        />
      )
    })}
  </Container>
))
