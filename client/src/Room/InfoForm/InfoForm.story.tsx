import React from 'react'
import { action } from '@storybook/addon-actions'
import { text } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData'

import * as InfoForm from '.'
import * as InfoTemplates from './InfoTemplates'

import parent from '../Room.story'

export default {
  title: `${parent.title} / InfoForm`
}

export const Skeleton: React.FC = () => <InfoForm.Skeleton />

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

export const WithInfoForm: React.FC = () => (
  <InfoForm.View
    state={{
      ...InfoForm.initialState,
      infoTemplates: {
        ...InfoTemplates.initialState,
        infoTemplates: RemoteData.Succeed([])
      }
    }}
    dispatch={action('dispatch')}
  />
)
