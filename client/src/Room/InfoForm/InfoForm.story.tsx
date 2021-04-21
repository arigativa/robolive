import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, boolean } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData'

import * as InfoForm from '.'

export default {
  title: 'InfoForm'
}

export const Initial: React.FC = () => (
  <InfoForm.View state={InfoForm.initialState} dispatch={action('dispatch')} />
)

export const SendInfoText: React.FC = () => {
  const info = text('Info', 'Some useful information to send')

  return (
    <InfoForm.View
      state={{
        ...InfoForm.initialState,
        info
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const WithTemplateForm: React.FC = () => (
  <InfoForm.View
    state={{
      ...InfoForm.initialState,
      templateName: text('Button name', 'ROTATE_LEFT')
    }}
    dispatch={action('dispatch')}
  />
)

export const TemplateNameIsBlank: React.FC = () => (
  <InfoForm.View
    state={{
      ...InfoForm.initialState,
      templateName: '    '
    }}
    dispatch={action('dispatch')}
  />
)

export const TemplateIsSaving: React.FC = () => (
  <InfoForm.View
    state={{
      ...InfoForm.initialState,
      templateName: 'ROTATE_LEFT',
      savingTemplate: boolean('Saving', true)
        ? RemoteData.Optional.Loading
        : RemoteData.Optional.NotAsked
    }}
    dispatch={action('dispatch')}
  />
)

export const TemplateSavingFails: React.FC = () => (
  <InfoForm.View
    state={{
      ...InfoForm.initialState,
      templateName: 'ROTATE_LEFT',
      savingTemplate: RemoteData.Optional.Failure(
        text('Error message', 'Endpoint is not reachable')
      )
    }}
    dispatch={action('dispatch')}
  />
)
