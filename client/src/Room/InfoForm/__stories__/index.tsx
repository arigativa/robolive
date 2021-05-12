import React from 'react'
import { action } from '@storybook/addon-actions'
import { number, text } from '@storybook/addon-knobs'
// import RemoteData from 'frctl/RemoteData'

import * as InfoForm from '..'
import * as InfoTemplates from '../InfoTemplates/__stories__'

export default {
  title: 'Room / InfoForm'
}

export const Skeleton: React.FC = () => <InfoForm.Skeleton />

export const Initial = (): JSX.Element => (
  <InfoForm.View state={Initial.state} dispatch={action('dispatch')} />
)

Initial.state = InfoForm.initialState

export const InfoTemplatesFailed = (): JSX.Element => (
  <InfoForm.View
    state={InfoTemplatesFailed.state}
    dispatch={action('dispatch')}
  />
)

InfoTemplatesFailed.state = {
  ...Initial.state,
  infoTemplates: InfoTemplates.FailureTemplateLoading.init()
}

export const InfoTemplatesLoaded = (): JSX.Element => {
  const infoTemplatesCount = number('InfoTemplates count', 10)

  return (
    <InfoForm.View
      state={InfoTemplatesLoaded.init(infoTemplatesCount)}
      dispatch={action('dispatch')}
    />
  )
}

InfoTemplatesLoaded.init = (infoTemplatesCount: number) => ({
  ...Initial.state,
  infoTemplates: InfoTemplates.ManyTemplates.init(infoTemplatesCount)
})

export const SendInfoText = (): JSX.Element => {
  const info = text('Info', 'Some useful information to send')

  return (
    <InfoForm.View
      state={SendInfoText.init(info)}
      dispatch={action('dispatch')}
    />
  )
}

SendInfoText.init = (info = 'Some useful information to send') => ({
  ...InfoTemplatesLoaded.init(2),
  info
})
