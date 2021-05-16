import React from 'react'
import RemoteData from 'frctl/RemoteData'
import { Box, VStack, HStack, Button } from '@chakra-ui/react'

import { Dispatch, Cmd, Sub, useMapDispatch } from 'core'
import { SipConnection } from 'sip'
import { Case } from 'utils'
import { AlertPanel } from 'AlertPanel'
import { SkeletonRect } from 'Skeleton'

import { Credentials } from '.'
import { OutgoingInfoMessage, ViewInfoMessage } from './InfoMessage'
import * as InfoForm from './InfoForm'
import * as Preferences from './Preferences'

const CONTAINER_MAX_WIDTH = 1800
const SIDEBAR_WIDTH = 420

// S T A T E

export interface State {
  stream: RemoteData.Optional<string, MediaStream>
  outgoingInfoMessages: ReadonlyArray<OutgoingInfoMessage>
  preferences: Preferences.State
  infoForm: InfoForm.State
}

export const initialState: State = {
  stream: RemoteData.Optional.Loading,
  outgoingInfoMessages: [],
  preferences: Preferences.initialState,
  infoForm: InfoForm.initialState
}

export const initCmd = (
  connection: SipConnection,
  credentials: Credentials
): Cmd<Action> => {
  return Cmd.batch([
    connection.getStream(stream => Connect({ stream })),
    Preferences.initialCmd.map(PreferencesAction),
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
  | Case<'PreferencesAction', { action: Preferences.Action }>
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
const PreferencesAction = (action: Preferences.Action): Action => ({
  type: 'PreferencesAction',
  action
})
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

    case 'PreferencesAction': {
      const [nextPreferences, cmd] = Preferences.update(
        action.action,
        state.preferences
      )

      return Updated(
        {
          ...state,
          preferences: nextPreferences
        },
        cmd.map(PreferencesAction)
      )
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
  hideTextarea: boolean
  hideTemplates: boolean
  infoForm: InfoForm.State
  dispatch: Dispatch<Action>
}>(({ hideTextarea, hideTemplates, infoForm, dispatch }) => (
  <InfoForm.View
    hideTextarea={hideTextarea}
    hideTemplates={hideTemplates}
    state={infoForm}
    dispatch={useMapDispatch(InfoFormAction, dispatch)}
  />
))

const ViewOutgoingInfoMessageList: React.VFC<{
  messages: ReadonlyArray<OutgoingInfoMessage>
  dispatch: Dispatch<Action>
}> = React.memo(({ messages, dispatch }) => (
  <Box display="flex" flexDirection="column" minHeight={0} alignItems="stretch">
    <VStack
      spacing="4"
      maxHeight="100%"
      overflowY="auto"
      marginX="-4"
      paddingX="4"
      marginBottom="-4"
      paddingBottom="4"
    >
      {messages.map(message => (
        <ViewOutgoingInfoMessage
          key={message.id}
          message={message}
          dispatch={dispatch}
        />
      ))}
    </VStack>
  </Box>
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

const ViewVideoStream: React.VFC<{
  stream: MediaStream
}> = React.memo(({ stream }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (videoRef.current != null) {
      videoRef.current.srcObject = stream.clone()
    }
  }, [stream])

  return (
    <Box height="100%" width="100%" background="gray.900">
      <video
        ref={videoRef}
        autoPlay
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  )
})

const ViewLayout: React.VFC<{
  header: React.ReactNode
  sidebar: React.ReactNode
  content: React.ReactNode
}> = ({ header, sidebar, content }) => (
  <HStack
    padding="4"
    spacing="4"
    alignItems="flex-start"
    width={CONTAINER_MAX_WIDTH}
    maxWidth="100%"
    height={CONTAINER_MAX_WIDTH - SIDEBAR_WIDTH}
    maxHeight="100%"
  >
    {content}
    <VStack
      flexShrink={0}
      width={SIDEBAR_WIDTH}
      maxHeight="100%"
      alignItems="stretch"
    >
      {header}
      {sidebar}
    </VStack>
  </HStack>
)

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => (
  <ViewLayout
    header={
      <HStack justifyContent="space-between">
        <Button
          alignSelf="flex-start"
          flexShrink={0}
          size="xs"
          variant="outline"
          colorScheme="teal"
          onClick={() => dispatch(GoToRobotsList)}
        >
          Back to Robots List
        </Button>

        <Preferences.View
          state={state.preferences}
          dispatch={useMapDispatch(PreferencesAction, dispatch)}
        />
      </HStack>
    }
    sidebar={state.stream.cata({
      NotAsked: () => <AlertPanel status="info">Call is ended.</AlertPanel>,

      Loading: () => <InfoForm.Skeleton />,

      Failure: message => (
        <AlertPanel status="error" title="Video Stream Error!">
          {message}
        </AlertPanel>
      ),

      Succeed: () => {
        const {
          showTextarea,
          showTemplates,
          showInfoLog
        } = state.preferences.getOrElse(Preferences.Preferences.defaults)

        return (
          <>
            <ViewInfoForm
              hideTextarea={!showTextarea}
              hideTemplates={!showTemplates}
              infoForm={state.infoForm}
              dispatch={dispatch}
            />

            {showInfoLog && (
              <ViewOutgoingInfoMessageList
                messages={state.outgoingInfoMessages}
                dispatch={dispatch}
              />
            )}
          </>
        )
      }
    })}
    content={state.stream.cata({
      Succeed: stream => <ViewVideoStream stream={stream} />,

      _: () => <SkeletonVideoStream />
    })}
  />
))

// S K E L E T O N

const SkeletonVideoStream: React.VFC = React.memo(() => (
  <SkeletonRect width="100%" height="100%" />
))

export const Skeleton = React.memo(() => (
  <ViewLayout
    header={
      <HStack justifyContent="space-between">
        <SkeletonRect width={132} height={24} />
        <Preferences.Skeleton />
      </HStack>
    }
    sidebar={<InfoForm.Skeleton />}
    content={<SkeletonVideoStream />}
  />
))
