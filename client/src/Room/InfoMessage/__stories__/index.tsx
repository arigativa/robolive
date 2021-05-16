import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, date } from '@storybook/addon-knobs'

import { InfoMessage } from '..'

export default {
  title: 'Room / InfoMessage'
}

export const WithPlainTextContent = (): React.ReactNode => {
  const content = text('Content', 'Raw no JSON message')
  const timestamp = date('Timestamp', new Date(2021, 4, 16, 15, 28, 51))

  return (
    <InfoMessage
      message={WithPlainTextContent.makeMessage(content, new Date(timestamp))}
      onResend={action('onResend')}
    />
  )
}

WithPlainTextContent.makeMessage = (content: string, timestamp: Date) => ({
  id: 0,
  content,
  timestamp
})

export const WithJsonContent = (): React.ReactNode => {
  const content = '{"foo":false,"baz":123}'

  return (
    <InfoMessage
      message={WithPlainTextContent.makeMessage(
        content,
        new Date(2021, 4, 16, 15, 28, 51)
      )}
      onResend={action('onResend')}
    />
  )
}
