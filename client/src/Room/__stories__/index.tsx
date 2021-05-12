import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, number } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData'
import { range } from 'utils'

import * as Room from '../Room'
import * as InfoForm from '../InfoForm/__stories__'

export default {
  title: 'Room'
}

export const Skeleton: React.FC = () => <Room.Skeleton />

export const Loading = (): React.ReactNode => (
  <Room.View state={Loading.state} dispatch={action('dispatch')} />
)

Loading.state = Room.initialState

export const Failure = (): React.ReactNode => {
  const reason = text('Reason', 'Could not connect to the server.')

  return (
    <Room.View state={Failure.init(reason)} dispatch={action('dispatch')} />
  )
}

Failure.init = (reason: string) => ({
  ...Room.initialState,
  stream: RemoteData.Optional.Failure(reason)
})

export const EndOfCall = (): React.ReactNode => (
  <Room.View state={EndOfCall.state} dispatch={action('dispatch')} />
)

EndOfCall.state = {
  ...Room.initialState,
  stream: RemoteData.Optional.NotAsked
}

interface CanvasElement extends HTMLCanvasElement {
  captureStream(frameRate?: number): MediaStream
}

export const OnCall = (): React.ReactNode => (
  <Room.View state={OnCall.useState()} dispatch={action('dispatch')} />
)

OnCall.useState = () => {
  const [stream, cleanup] = React.useMemo(() => {
    const canvas = document.createElement('canvas') as CanvasElement
    canvas.width = 1
    canvas.height = 1
    canvas.getContext('2d')?.fillRect(0, 0, 1, 1)

    return [canvas.captureStream(1), () => canvas.remove()]
  }, [])

  React.useEffect(() => cleanup, [cleanup])

  return {
    ...Room.initialState,
    infoForm: InfoForm.InfoTemplatesLoaded.init(3),
    stream: RemoteData.Optional.Succeed(stream)
  }
}

export const Terminating = (): React.ReactNode => (
  <Room.View state={Terminating.useState()} dispatch={action('dispatch')} />
)

Terminating.useState = () => ({
  ...OnCall.useState(),
  terminating: true
})

export const WithInfoMessage = (): React.ReactNode => {
  const messageContent = text('Message Content', 'Raw no JSON message')

  return (
    <Room.View
      state={WithInfoMessage.useState(messageContent)}
      dispatch={action('dispatch')}
    />
  )
}

WithInfoMessage.useState = (messageContent: string) => ({
  ...OnCall.useState(),
  outgoingInfoMessages: [{ id: 0, content: messageContent }]
})

export const WithJsonInfoMessage = (): React.ReactNode => {
  const messageContent = '{"foo":false,"baz":123}'

  return (
    <Room.View
      state={WithInfoMessage.useState(messageContent)}
      dispatch={action('dispatch')}
    />
  )
}

export const WithMultiplyInfoMessages = (): React.ReactNode => {
  const messagesCount = number('# Messages', 5, {
    range: true,
    min: 0,
    max: 10
  })

  return (
    <Room.View
      state={WithMultiplyInfoMessages.useState(messagesCount)}
      dispatch={action('dispatch')}
    />
  )
}

WithMultiplyInfoMessages.useState = (messagesCount: number) => ({
  ...OnCall.useState(),
  outgoingInfoMessages: range(messagesCount).map(id => ({
    id,
    content: `Some content of #${id} message`
  }))
})
