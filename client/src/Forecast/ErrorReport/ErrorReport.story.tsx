import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, number, boolean } from '@storybook/addon-knobs'
import Decode from 'frctl/Json/Decode'

import { Error as HttpError } from 'httpBuilder'
import ErrorReport from './index'

const knobBodeMessage = (initialAnswer: boolean): string =>
  boolean('Has body message', initialAnswer)
    ? JSON.stringify({
        message: text(
          'Body message',
          'Your account is temporary blocked due to exceeding of requests limitation of your subscription type.'
        )
      })
    : ''

export default {
  title: 'Forecast . ErrorReport',
  component: ErrorReport
}

export const NetworkError: React.FC = () => (
  <ErrorReport error={HttpError.NetworkError} onRetry={action('onRetry')} />
)

export const Timeout: React.FC = () => (
  <ErrorReport error={HttpError.Timeout} onRetry={action('onRetry')} />
)

export const BadUrl: React.FC = () => (
  <ErrorReport
    error={HttpError.BadUrl(text('Url', 'wrongurl'))}
    onRetry={action('onRetry')}
  />
)

export const BadStatus500: React.FC = () => (
  <ErrorReport
    error={HttpError.BadStatus({
      url: text('Url', 'https://google.com'),
      statusCode: number('Status Code', 501, {
        min: 500,
        max: 599
      }),
      statusText: text('Status Text', 'Not Implemented'),
      headers: {},
      body: knobBodeMessage(true)
    })}
    onRetry={action('onRetry')}
  />
)

export const BadStatus400: React.FC = () => (
  <ErrorReport
    error={HttpError.BadStatus({
      url: text('Url', 'https://google.com'),
      statusCode: number('Status Code', 404, {
        min: 400,
        max: 499
      }),
      statusText: text('Status Text', 'Not Found'),
      headers: {},
      body: knobBodeMessage(true)
    })}
    onRetry={action('onRetry')}
  />
)

export const BadBody: React.FC = () => (
  <ErrorReport
    error={HttpError.BadBody(
      Decode.Error.Field(
        'items',
        Decode.Error.Index(
          0,
          Decode.Error.Failure(
            text('Failure Message', 'Expect STRING but get NUMBER'),
            JSON.stringify(
              {
                items: [123, '456']
              },
              null,
              4
            )
          )
        )
      ),
      {
        url: 'https://google.com',
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: ''
      }
    )}
    onRetry={action('onRetry')}
  />
)
