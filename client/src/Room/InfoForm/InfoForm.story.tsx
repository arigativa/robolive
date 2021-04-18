import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, boolean } from '@storybook/addon-knobs'

import * as InfoForm from '.'

export default {
  title: 'InfoForm'
}

export const Initial: React.FC = () => (
  <InfoForm.View state={InfoForm.initial} dispatch={action('dispatch')} />
)

export const SendInfoText: React.FC = () => {
  const info = text('Info', 'Some useful information to send')

  return (
    <InfoForm.View
      state={{
        ...InfoForm.initial,
        info
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const WithTemplateForm: React.FC = () => (
  <InfoForm.View
    state={{
      ...InfoForm.initial,
      templateName: text('Button name', 'ROTATE_LEFT')
    }}
    dispatch={action('dispatch')}
  />
)

export const TemplateNameIsBlank: React.FC = () => (
  <InfoForm.View
    state={{
      ...InfoForm.initial,
      templateName: '    '
    }}
    dispatch={action('dispatch')}
  />
)

export const TemplateIsSaving: React.FC = () => (
  <InfoForm.View
    state={{
      ...InfoForm.initial,
      templateName: 'ROTATE_LEFT',
      savingTemplate: boolean('Saving', true)
    }}
    dispatch={action('dispatch')}
  />
)
