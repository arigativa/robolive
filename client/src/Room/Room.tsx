import React from 'react'
import RemoteData from 'frctl/RemoteData'
import { Box, Button, VStack } from '@chakra-ui/react'

import { Dispatch, Cmd, Sub, useMapDispatch } from 'core'
import { SipConnection } from 'sip'
import { Case } from 'utils'
import { AlertPanel } from 'AlertPanel'
import { SkeletonRect } from 'Skeleton'

import { Credentials } from '.'
import { OutgoingInfoMessage, ViewInfoMessage } from './InfoMessage'
import * as InfoForm from './InfoForm'

// S T A T E

export interface State {
  stream: RemoteData.Optional<string, MediaStream>
  outgoingInfoMessages: Array<OutgoingInfoMessage>
  infoForm: InfoForm.State
}

export const initialState: State = {
  stream: RemoteData.Optional.Loading,
  outgoingInfoMessages: [],
  infoForm: InfoForm.initialState
}

export const initCmd = (
  connection: SipConnection,
  credentials: Credentials
): Cmd<Action> => {
  return Cmd.batch([
    connection.getStream(stream => Connect({ stream })),
    InfoForm.initCmd(credentials).map(InfoFormAction)
  ])
}

// U P D A T E

export type Stage =
  | Case<'Updated', { state: State; cmd: Cmd<Action> }>
  | Case<'BackToList'>

const Updated = (state: State, cmd: Cmd<Action>): Stage => ({
  type: 'Updated',
  state,
  cmd
})
const BackToList = Case.of<Stage, 'BackToList'>('BackToList')()

export type Action =
  | Case<'Connect', { stream: MediaStream }>
  | Case<'FailConnection', { reason: string }>
  | Case<'NewOutgoingMessage', { content: string }>
  | Case<'SaveOutgoingMessage', { message: OutgoingInfoMessage }>
  | Case<'SendInfoAgain', { content: string }>
  | Case<'GoToRobotsList'>
  | Case<'InfoFormAction', { action: InfoForm.Action }>

const Connect = Case.of<Action, 'Connect'>('Connect')
const FailConnection = Case.of<Action, 'FailConnection'>('FailConnection')
const NewOutgoingMessage = Case.of<Action, 'NewOutgoingMessage'>(
  'NewOutgoingMessage'
)
const SaveOutgoingMessage = Case.of<Action, 'SaveOutgoingMessage'>(
  'SaveOutgoingMessage'
)
const SendInfoAgain = Case.of<Action, 'SendInfoAgain'>('SendInfoAgain')
const GoToRobotsList = Case.of<Action, 'GoToRobotsList'>('GoToRobotsList')()
const InfoFormAction = (action: InfoForm.Action): Action => ({
  type: 'InfoFormAction',
  action
})

export const update = (
  action: Action,
  credentials: Credentials,
  connection: SipConnection,
  state: State
): Stage => {
  switch (action.type) {
    case 'Connect': {
      return Updated(
        {
          ...state,
          stream: RemoteData.Optional.Succeed(action.stream)
        },
        Cmd.none
      )
    }

    case 'FailConnection': {
      return Updated(
        {
          ...state,
          stream: RemoteData.Optional.Failure(action.reason)
        },
        Cmd.none
      )
    }

    case 'NewOutgoingMessage': {
      return Updated(
        state,
        Cmd.create<Action>(done => {
          done(
            SaveOutgoingMessage({
              message: {
                id: state.outgoingInfoMessages.length,
                content: action.content,
                timestamp: new Date()
              }
            })
          )
        })
      )
    }

    case 'SaveOutgoingMessage': {
      return Updated(
        {
          ...state,
          outgoingInfoMessages: [action.message, ...state.outgoingInfoMessages]
        },
        Cmd.none
      )
    }

    case 'SendInfoAgain': {
      return Updated(state, connection.sendInfo(action.content))
    }

    case 'GoToRobotsList': {
      return BackToList
    }

    case 'InfoFormAction': {
      const [nextInfoForm, cmd] = InfoForm.update(
        action.action,
        credentials,
        connection,
        state.infoForm
      )

      return Updated(
        {
          ...state,
          infoForm: nextInfoForm
        },
        cmd.map(InfoFormAction)
      )
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
    connection.onFailure(reason => FailConnection({ reason })),
    connection.onOutgoingInfo(content => NewOutgoingMessage({ content }))
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

const ViewOutgoingInfoMessage = React.memo<{
  message: OutgoingInfoMessage
  dispatch: Dispatch<Action>
}>(({ message, dispatch }) => (
  <ViewInfoMessage
    message={message}
    onResend={React.useCallback(
      () => dispatch(SendInfoAgain({ content: message.content })),
      [dispatch, message.content]
    )}
  />
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

      <VStack mt="4" spacing="4">
        {outgoingInfoMessages.map(message => (
          <ViewOutgoingInfoMessage
            key={message.id}
            message={message}
            dispatch={dispatch}
          />
        ))}
      </VStack>
    </Box>
  )
})

const ViewContainer: React.FC = ({ children }) => (
  <VStack align="start" alignItems="stretch">
    {children}
  </VStack>
)

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => (
  <ViewContainer>
    <Button
      alignSelf="flex-start"
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
  </ViewContainer>
))

// S K E L E T O N

export const Skeleton = React.memo(() => (
  <ViewContainer>
    <SkeletonRect width={132} height={24} />
    <InfoForm.Skeleton />
  </ViewContainer>
))
