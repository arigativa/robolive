import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, boolean, number } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData/Optional'

import * as Room from './Room'

export default {
  title: 'Room'
}

export const Loading: React.FC = () => (
  <Room.View state={Room.initialState} dispatch={action('dispatch')} />
)

export const Failure: React.FC = () => {
  const reason = text('Reason', 'Could not connect to the server.')

  return (
    <Room.View
      state={{
        ...Room.initialState,
        stream: RemoteData.Failure(reason)
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const EndOfCall: React.FC = () => (
  <Room.View
    state={{ ...Room.initialState, stream: RemoteData.NotAsked }}
    dispatch={action('dispatch')}
  />
)

interface CanvasElement extends HTMLCanvasElement {
  captureStream(frameRate?: number): MediaStream
}

const useFakeStream = (): MediaStream => {
  const [stream, cleanup] = React.useMemo(() => {
    const canvas = document.createElement('canvas') as CanvasElement
    canvas.width = 1
    canvas.height = 1
    canvas.getContext('2d')?.fillRect(0, 0, 1, 1)

    return [canvas.captureStream(1), () => canvas.remove()]
  }, [])

  React.useEffect(() => cleanup, [cleanup])

  return stream
}

export const OnCall: React.FC = () => {
  const stream = useFakeStream()

  return (
    <Room.View
      state={{
        ...Room.initialState,
        stream: RemoteData.Succeed(stream)
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const Terminating: React.FC = () => {
  const terminating = boolean('Terminating', true)
  const stream = useFakeStream()

  return (
    <Room.View
      state={{
        ...Room.initialState,
        terminating,
        stream: RemoteData.Succeed(stream)
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const WithRawInfoMessage: React.FC = () => {
  const messageContent = text('Message Content', 'Raw no JSON message')
  const stream = useFakeStream()

  return (
    <Room.View
      state={{
        ...Room.initialState,
        stream: RemoteData.Succeed(stream),
        outgoingInfoMessages: [{ id: 0, content: messageContent }]
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const WithJsonInfoMessage: React.FC = () => {
  const messageContent = '{"foo":false,"baz":123}'

  const stream = useFakeStream()

  return (
    <Room.View
      state={{
        ...Room.initialState,
        stream: RemoteData.Succeed(stream),
        outgoingInfoMessages: [{ id: 0, content: messageContent }]
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const WithMultiplyInfoMessages: React.FC = () => {
  const messagesCount = number('# Messages', 5, {
    range: true,
    min: 0,
    max: 10
  })
  const messageContent = text(
    'Message Content',
    'Some content of #{id} message'
  )
  const stream = useFakeStream()

  return (
    <Room.View
      state={{
        ...Room.initialState,
        stream: RemoteData.Succeed(stream),
        outgoingInfoMessages: Array.from({
          length: messagesCount
        }).map((_, id) => ({
          id,
          content: messageContent.replace(/\{id\}/g, id.toString())
        }))
      }}
      dispatch={action('dispatch')}
    />
  )
}
