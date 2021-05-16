import React from 'react'
import { action } from '@storybook/addon-actions'
import { number, text, boolean } from '@storybook/addon-knobs'

import * as InfoForm from '..'
import * as InfoTemplates from '../InfoTemplates/__stories__'

export default {
  title: 'Room / InfoForm'
}

export const Skeleton: React.FC = () => (
  <InfoForm.Skeleton
    hideTemplates={boolean('hideTemplates', false)}
    hideTextarea={boolean('hideTextarea', false)}
  />
)

export const Initial = (): React.ReactNode => (
  <InfoForm.View state={Initial.state} dispatch={action('dispatch')} />
)

Initial.state = InfoForm.initialState

export const InfoTemplatesFailed = (): React.ReactNode => (
  <InfoForm.View
    state={InfoTemplatesFailed.state}
    dispatch={action('dispatch')}
  />
)

InfoTemplatesFailed.state = {
  ...Initial.state,
  infoTemplates: InfoTemplates.FailureTemplateLoading.init(
    'Something went wrong'
  )
}

export const InfoTemplatesLoaded = (): React.ReactNode => {
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

export const HideTemplates = (): React.ReactNode => (
  <InfoForm.View
    hideTemplates
    state={HideTemplates.init(10)}
    dispatch={action('dispatch')}
  />
)

HideTemplates.init = InfoTemplatesLoaded.init

export const SendInfoText = (): React.ReactNode => {
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

export const HideTextarea = (): React.ReactNode => (
  <InfoForm.View
    hideTextarea
    state={HideTextarea.init()}
    dispatch={action('dispatch')}
  />
)

HideTextarea.init = SendInfoText.init
