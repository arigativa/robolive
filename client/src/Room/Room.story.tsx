import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, boolean } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData/Optional'

import * as Room from '.'

export default {
  title: 'Room'
}

const [initialState] = Room.init({
  signallingUri: 'signallingUri',
  sipAgentName: 'sipAgentName',
  sipClientName: 'sipClientName',
  stunUri: 'stunUri',
  turnUri: 'turnUri'
})

export const Loading: React.FC = () => (
  <Room.View state={initialState} dispatch={action('dispatch')} />
)

export const Failure: React.FC = () => {
  const reason = text('Reason', 'Could not connect to the server.')

  return (
    <Room.View
      state={{
        ...initialState,
        stream: RemoteData.Failure(reason)
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const EndOfCall: React.FC = () => (
  <Room.View
    state={{ ...initialState, stream: RemoteData.NotAsked }}
    dispatch={action('dispatch')}
  />
)

interface CanvasElement extends HTMLCanvasElement {
  captureStream(frameRate?: number): MediaStream
}

const useFakeStream = (): null | MediaStream => {
  const [stream, setStream] = React.useState<null | MediaStream>(null)

  React.useEffect(() => {
    const canvas = document.createElement('canvas') as CanvasElement
    canvas.width = 1
    canvas.height = 1
    canvas.getContext('2d')?.fillRect(0, 0, 1, 1)

    setStream(canvas.captureStream(1))

    return () => {
      canvas.remove()
    }
  }, [])

  return stream
}

export const OnCall: React.FC = () => {
  const stream = useFakeStream()

  if (!stream) {
    return null
  }

  return (
    <Room.View
      state={{
        ...initialState,
        stream: RemoteData.Succeed(stream)
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const SendInfoText: React.FC = () => {
  const info = text('Info', 'Some useful information to send')
  const saveOnSubmit = boolean('Save on Submit', true)
  const stream = useFakeStream()

  if (!stream) {
    return null
  }

  return (
    <Room.View
      state={{
        ...initialState,
        info,
        saveOnSubmit,
        stream: RemoteData.Succeed(stream)
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const Terminating: React.FC = () => {
  const terminating = boolean('Terminating', true)
  const stream = useFakeStream()

  if (!stream) {
    return null
  }

  return (
    <Room.View
      state={{
        ...initialState,
        terminating,
        stream: RemoteData.Succeed(stream)
      }}
      dispatch={action('dispatch')}
    />
  )
}
