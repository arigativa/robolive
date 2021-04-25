import React from 'react'
import RemoteData from 'frctl/RemoteData'
import { Box, Button, VStack, Heading, Text } from '@chakra-ui/react'

import { Dispatch, Cmd, Sub, useMapDispatch } from 'core'
import { SipConnection } from 'sip'
import { Case } from 'utils'
import { AlertPanel } from 'AlertPanel'
import { SkeletonRect } from 'Skeleton'

import { Credentials } from '.'
import * as InfoForm from './InfoForm'

// S T A T E

interface OutgoingInfoMessage {
  id: number
  content: string
}

export interface State {
  stream: RemoteData.Optional<string, MediaStream>
  terminating: boolean
  outgoingInfoMessages: Array<OutgoingInfoMessage>
  infoForm: InfoForm.State
}

export const initialState: State = {
  stream: RemoteData.Optional.Loading,
  terminating: false,
  outgoingInfoMessages: [],
  infoForm: InfoForm.initialState
}

export const initCmd = (
  connection: SipConnection,
  credentials: Credentials
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
  | Case<'GoToRobotsList'>
  | Case<'InfoFormAction', InfoForm.Action>

const Connect = Case.of<Action, 'Connect'>('Connect')
const FailConnection = Case.of<Action, 'FailConnection'>('FailConnection')
const NewOutgoingMessage = Case.of<Action, 'NewOutgoingMessage'>(
  'NewOutgoingMessage'
)
const SendInfoAgain = Case.of<Action, 'SendInfoAgain'>('SendInfoAgain')
const GoToRobotsList = Case.of<Action, 'GoToRobotsList'>('GoToRobotsList')()
const InfoFormAction = Case.of<Action, 'InfoFormAction'>('InfoFormAction')

export const update = (
  action: Action,
  credentials: Credentials,
  connection: SipConnection,
  state: State
): Stage => {
  switch (action.type) {
    case 'Connect': {
      return Updated([
        {
          ...state,
          stream: RemoteData.Optional.Succeed(action.payload)
        },
        Cmd.none
      ])
    }

    case 'FailConnection': {
      return Updated([
        {
          ...state,
          stream: RemoteData.Optional.Failure(action.payload)
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
    <Box width="100%">
      <video ref={videoRef} autoPlay />

      <Box mt="2">
        <ViewInfoForm infoForm={infoForm} dispatch={dispatch} />
      </Box>

      <Box mt="4">
        <ViewOutgoingInfoMessages
          messages={outgoingInfoMessages}
          dispatch={dispatch}
        />
      </Box>
    </Box>
  )
})

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => (
  <VStack align="start">
    <Button
      size="xs"
      variant="outline"
      colorScheme="teal"
      onClick={() => dispatch(GoToRobotsList)}
    >
      Back to Robots List
    </Button>

    {state.stream.cata({
      NotAsked: () => <AlertPanel status="info">Call is ended.</AlertPanel>,

      Loading: () => <InfoForm.Skeleton />,

      Failure: message => (
        <AlertPanel status="error" title="Video Stream Error!">
          {message}
        </AlertPanel>
      ),

      Succeed: stream => (
        <ViewSucceed
          stream={stream}
          outgoingInfoMessages={state.outgoingInfoMessages}
          infoForm={state.infoForm}
          dispatch={dispatch}
        />
      )
    })}
  </VStack>
))

// S K E L E T O N

export const Skeleton = React.memo(() => (
  <VStack align="start">
    <SkeletonRect width={132} height={24} />
    <InfoForm.Skeleton />
  </VStack>
))
