import React from 'react'
import RemoteData from 'frctl/RemoteData/Optional'
import {
  Container,
  Box,
  Stack,
  StackItem,
  Button,
  VStack,
  Heading,
  Text
} from '@chakra-ui/react'

import { Dispatch, Cmd, Sub, useMapDispatch } from 'core'
import { SipConnection } from 'sip'
import { Case } from 'utils'

import { RoomCredentials } from '.'
import * as InfoForm from './InfoForm'

// S T A T E

interface OutgoingInfoMessage {
  id: number
  content: string
}

export interface State {
  stream: RemoteData<string, MediaStream>
  terminating: boolean
  outgoingInfoMessages: Array<OutgoingInfoMessage>
  infoForm: InfoForm.State
}

export const initialState: State = {
  stream: RemoteData.Loading,
  terminating: false,
  outgoingInfoMessages: [],
  infoForm: InfoForm.initialState
}

export const initCmd = (
  connection: SipConnection,
  credentials: RoomCredentials
): Cmd<Action> => {
  return Cmd.batch([
    connection.getStream(Connect),
    InfoForm.initCmd(credentials).map(InfoFormAction)
  ])
}

// U P D A T E

export type Stage = Case<'Updated', [State, Cmd<Action>]> | Case<'BackToList'>

const Updated = Case.of<Stage, 'Updated'>('Updated')
const BackToList = Case.of<Stage, 'BackToList'>('BackToList')()

export type Action =
  | Case<'Connect', MediaStream>
  | Case<'FailConnection', string>
  | Case<'NewOutgoingMessage', string>
  | Case<'SendInfoAgain', string>
  | Case<'Terminate'>
  | Case<'GoToRobotsList'>
  | Case<'InfoFormAction', InfoForm.Action>

const Connect = Case.of<Action, 'Connect'>('Connect')
const FailConnection = Case.of<Action, 'FailConnection'>('FailConnection')
const NewOutgoingMessage = Case.of<Action, 'NewOutgoingMessage'>(
  'NewOutgoingMessage'
)
const SendInfoAgain = Case.of<Action, 'SendInfoAgain'>('SendInfoAgain')
const Terminate = Case.of<Action, 'Terminate'>('Terminate')()
const GoToRobotsList = Case.of<Action, 'GoToRobotsList'>('GoToRobotsList')()
const InfoFormAction = Case.of<Action, 'InfoFormAction'>('InfoFormAction')

export const update = (
  action: Action,
  credentials: RoomCredentials,
  connection: SipConnection,
  state: State
): Stage => {
  switch (action.type) {
    case 'Connect': {
      return Updated([
        {
          ...state,
          stream: RemoteData.Succeed(action.payload)
        },
        Cmd.none
      ])
    }

    case 'FailConnection': {
      return Updated([
        {
          ...state,
          stream: RemoteData.Failure(action.payload)
        },
        Cmd.none
      ])
    }

    case 'NewOutgoingMessage': {
      return Updated([
        {
          ...state,
          outgoingInfoMessages: [
            {
              id: state.outgoingInfoMessages.length,
              content: action.payload
            },
            ...state.outgoingInfoMessages
          ]
        },
        Cmd.none
      ])
    }

    case 'SendInfoAgain': {
      return Updated([state, connection.sendInfo(action.payload)])
    }

    case 'Terminate': {
      return Updated([
        {
          ...state,
          terminating: true
        },
        connection.terminate
      ])
    }

    case 'GoToRobotsList': {
      return BackToList
    }

    case 'InfoFormAction': {
      const [nextInfoForm, cmd] = InfoForm.update(
        action.payload,
        credentials,
        connection,
        state.infoForm
      )

      return Updated([
        {
          ...state,
          infoForm: nextInfoForm
        },
        cmd.map(InfoFormAction)
      ])
    }
  }
}

// S U B S C R I P T I O N S

export const subscriptions = (
  connection: SipConnection,
  state: State
): Sub<Action> => {
  if (state.stream.isNotAsked() || state.stream.isFailure()) {
    return Sub.none
  }

  return Sub.batch([
    connection.onEnd(GoToRobotsList),
    connection.onFailure(FailConnection),
    connection.onOutgoingInfo(NewOutgoingMessage)
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

const ViewInfoForm = React.memo<{
  infoForm: InfoForm.State
  dispatch: Dispatch<Action>
}>(({ infoForm, dispatch }) => (
  <InfoForm.View
    state={infoForm}
    dispatch={useMapDispatch(InfoFormAction, dispatch)}
  />
))

const parseMessageContent = (content: string): string => {
  try {
    return JSON.stringify(JSON.parse(content), null, 4)
  } catch {
    return content
  }
}

const ViewOutgoingInfoMessage = React.memo<{
  message: OutgoingInfoMessage
  dispatch: Dispatch<Action>
}>(({ message, dispatch }) => {
  const parsedContent = React.useMemo(
    () => parseMessageContent(message.content),
    [message.content]
  )

  return (
    <Box
      p="5"
      width="100%"
      shadow="md"
      borderWidth="1"
      borderRadius="md"
      wordBreak="break-all"
    >
      <Heading fontSize="xl">Message #{message.id}</Heading>

      <Box mt="2" p="3" width="100%" borderRadius="sm" bg="gray.50">
        <Text fontSize="sm" as="pre">
          {parsedContent}
        </Text>
      </Box>

      <Button
        mt="2"
        size="xs"
        type="submit"
        colorScheme="teal"
        onClick={() => {
          dispatch(SendInfoAgain(message.content))
        }}
      >
        Send again
      </Button>
    </Box>
  )
})

const ViewOutgoingInfoMessages = React.memo<{
  messages: Array<OutgoingInfoMessage>
  dispatch: Dispatch<Action>
}>(({ messages, dispatch }) => (
  <VStack>
    {messages.map(message => (
      <ViewOutgoingInfoMessage
        key={message.id}
        message={message}
        dispatch={dispatch}
      />
    ))}
  </VStack>
))

const ViewSucceed = React.memo<{
  stream: MediaStream
  outgoingInfoMessages: Array<OutgoingInfoMessage>
  infoForm: InfoForm.State
  dispatch: Dispatch<Action>
}>(({ stream, outgoingInfoMessages, infoForm, dispatch }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (videoRef.current != null) {
      videoRef.current.srcObject = stream.clone()
    }
  }, [stream])

  return (
    <Stack>
      <StackItem>
        <video ref={videoRef} autoPlay />
      </StackItem>

      <StackItem>
        <ViewInfoForm infoForm={infoForm} dispatch={dispatch} />
      </StackItem>

      <StackItem>
        <ViewOutgoingInfoMessages
          messages={outgoingInfoMessages}
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
    <Stack>
      <StackItem>
        <Button
          variant="link"
          colorScheme="teal"
          isDisabled={state.terminating}
          onClick={() => dispatch(Terminate)}
        >
          Back to Robots List
        </Button>
      </StackItem>

      {state.stream.cata({
        NotAsked: () => <ViewCallOver dispatch={dispatch} />,

        Loading: () => <div>Loading...</div>,

        Failure: reason => <ViewFailure reason={reason} dispatch={dispatch} />,

        Succeed: stream => (
          <ViewSucceed
            stream={stream}
            outgoingInfoMessages={state.outgoingInfoMessages}
            infoForm={state.infoForm}
            dispatch={dispatch}
          />
        )
      })}
    </Stack>
  </Container>
))

// S K E L E T O N

export const Skeleton = React.memo(() => null)
