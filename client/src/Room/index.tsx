import React from 'react'
import styled from '@emotion/styled'
import RemoteData from 'frctl/RemoteData/Optional'
import {
  Container,
  Box,
  Stack,
  StackItem,
  FormControl,
  FormLabel,
  FormHelperText,
  Button,
  Textarea,
  VStack,
  HStack,
  Heading,
  Text
} from '@chakra-ui/react'

import { Dispatch, Cmd, Sub, useMapDispatch } from 'core'
import { RoomConfiguration } from 'api'
import { Connection, createConnection } from 'sip'
import { Case } from 'utils'

import * as SaveTemplate from './SaveTemplate'

// S T A T E

const IS_SECURE_SIP_CONNECTION =
  process.env.REACT_APP_IS_SECURE_SIP_CONNECTION === 'true'

interface OutgoingInfoMessage {
  id: number
  content: string
}

export interface State {
  connection: Connection
  stream: RemoteData<string, MediaStream>
  info: string
  terminating: boolean
  outgoingInfoMessages: Array<OutgoingInfoMessage>
  saveTemplate: null | SaveTemplate.State
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
      outgoingInfoMessages: [],
      saveTemplate: null
    },
    connection.getStream(Connect)
  ]
}

// U P D A T E

export type Stage = Case<'Updated', [State, Cmd<Action>]> | Case<'BackToList'>

const Updated = Case.of<Stage, 'Updated'>('Updated')
const BackToList = Case.of<Stage, 'BackToList'>('BackToList')()

export type Action =
  | Case<'Connect', MediaStream>
  | Case<'FailConnection', string>
  | Case<'NewOutgoingMessage', string>
  | Case<'ChangeInfo', string>
  | Case<'SendInfo', string>
  | Case<'Terminate'>
  | Case<'GoToRobotsList'>
  | Case<'ShowSaveTemplate'>
  | Case<'SaveTemplateAction', SaveTemplate.Action>

const Connect = Case.of<Action, 'Connect'>('Connect')
const FailConnection = Case.of<Action, 'FailConnection'>('FailConnection')
const NewOutgoingMessage = Case.of<Action, 'NewOutgoingMessage'>(
  'NewOutgoingMessage'
)
const ChangeInfo = Case.of<Action, 'ChangeInfo'>('ChangeInfo')
const SendInfo = Case.of<Action, 'SendInfo'>('SendInfo')
const Terminate = Case.of<Action, 'Terminate'>('Terminate')()
const GoToRobotsList = Case.of<Action, 'GoToRobotsList'>('GoToRobotsList')()
const ShowSaveTemplate = Case.of<Action, 'ShowSaveTemplate'>(
  'ShowSaveTemplate'
)()
const SaveTemplateAction = Case.of<Action, 'SaveTemplateAction'>(
  'SaveTemplateAction'
)

export const update = (action: Action, state: State): Stage => {
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

    case 'ChangeInfo': {
      return Updated([
        {
          ...state,
          info: action.payload
        },
        Cmd.none
      ])
    }

    case 'SendInfo': {
      return Updated([state, state.connection.sendInfo(action.payload)])
    }

    case 'Terminate': {
      return Updated([
        {
          ...state,
          terminating: true
        },
        state.connection.terminate
      ])
    }

    case 'GoToRobotsList': {
      return BackToList
    }

    case 'ShowSaveTemplate': {
      return Updated([
        {
          ...state,
          saveTemplate: SaveTemplate.initial
        },
        Cmd.none
      ])
    }

    case 'SaveTemplateAction': {
      if (state.saveTemplate == null) {
        return Updated([state, Cmd.none])
      }

      return SaveTemplate.update(action.payload, state.saveTemplate).match({
        Updated: ([nextSaveTemplate, cmd]) => {
          return Updated([
            {
              ...state,
              saveTemplate: nextSaveTemplate
            },
            cmd.map(SaveTemplateAction)
          ])
        },

        Saved: () => {
          return Updated([
            {
              ...state,
              saveTemplate: null
            },
            Cmd.none
          ])
        },

        Canceled: () => {
          return Updated([
            {
              ...state,
              saveTemplate: null
            },
            Cmd.none
          ])
        }
      })
    }
  }
}

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (state.stream.isNotAsked() || state.stream.isFailure()) {
    return Sub.none
  }

  return Sub.batch([
    state.connection.onEnd(GoToRobotsList),
    state.connection.onFailure(FailConnection),
    state.connection.onOutgoingInfo(NewOutgoingMessage)
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
  font-family: monospace;
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

const ViewSaveTemplate = React.memo<{
  template: string
  saveTemplate: SaveTemplate.State
  dispatch: Dispatch<Action>
}>(({ template, saveTemplate, dispatch }) => (
  <SaveTemplate.View
    autoFocus
    template={template}
    state={saveTemplate}
    dispatch={useMapDispatch(SaveTemplateAction, dispatch)}
  />
))

const ViewSendInfo = React.memo<{
  info: string
  saveTemplate: null | SaveTemplate.State
  dispatch: Dispatch<Action>
}>(({ info, saveTemplate, dispatch }) => {
  const [submitting, fakeSubmitting] = useFakeSubmitting(400)

  return (
    <Stack
      as="form"
      onSubmit={event => {
        fakeSubmitting()
        dispatch(SendInfo(info))

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
            You can submit both plain text and JSON or save it as a Button
          </FormHelperText>
        </FormControl>
      </StackItem>

      <StackItem>
        {saveTemplate == null ? (
          <HStack>
            <Button type="submit" colorScheme="teal" isLoading={submitting}>
              Submit
            </Button>

            <Button
              variant="outline"
              colorScheme="teal"
              onClick={() => dispatch(ShowSaveTemplate)}
            >
              Save as Button
            </Button>
          </HStack>
        ) : (
          <ViewSaveTemplate
            template={info}
            saveTemplate={saveTemplate}
            dispatch={dispatch}
          />
        )}
      </StackItem>
    </Stack>
  )
})

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
          dispatch(SendInfo(message.content))
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
  info: string
  stream: MediaStream
  outgoingInfoMessages: Array<OutgoingInfoMessage>
  saveTemplate: null | SaveTemplate.State
  dispatch: Dispatch<Action>
}>(({ info, stream, outgoingInfoMessages, saveTemplate, dispatch }) => {
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
        <ViewSendInfo
          info={info}
          saveTemplate={saveTemplate}
          dispatch={dispatch}
        />
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
            info={state.info}
            stream={stream}
            outgoingInfoMessages={state.outgoingInfoMessages}
            saveTemplate={state.saveTemplate}
            dispatch={dispatch}
          />
        )
      })}
    </Stack>
  </Container>
))
