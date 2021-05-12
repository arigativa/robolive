import React from 'react'
import { action } from '@storybook/addon-actions'
import { number, text } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData'
import { range } from 'utils'

import * as InfoTemplates from '..'

export default {
  title: 'Room / InfoForm / InfoTemplates'
}

export const Skeleton: React.VFC = () => <InfoTemplates.Skeleton />

export const LoadingTemplates = (): React.ReactNode => (
  <InfoTemplates.View
    template=""
    state={LoadingTemplates.state}
    dispatch={action('dispatch')}
  />
)

LoadingTemplates.state = InfoTemplates.initialState

export const FailureTemplateLoading = (): React.ReactNode => {
  const reason = text('Error message', 'Something went wrong 🚨')

  return (
    <InfoTemplates.View
      template=""
      state={FailureTemplateLoading.init(reason)}
      dispatch={action('dispatch')}
    />
  )
}

FailureTemplateLoading.init = (reason: string) => ({
  ...InfoTemplates.initialState,
  infoTemplates: RemoteData.Failure(reason)
})

export const EmptyTemplateName = (): React.ReactNode => (
  <InfoTemplates.View
    template=""
    state={EmptyTemplateName.state}
    dispatch={action('dispatch')}
  />
)

EmptyTemplateName.state = {
  ...InfoTemplates.initialState,
  infoTemplates: RemoteData.Succeed([])
}

export const NonEmptyTemplateName = (): React.ReactNode => {
  const templateName = text('Template name', 'Rotate_180deg')

  return (
    <InfoTemplates.View
      template=""
      state={NonEmptyTemplateName.init(templateName)}
      dispatch={action('dispatch')}
    />
  )
}

NonEmptyTemplateName.init = (templateName = 'Rotate_180deg') => ({
  ...EmptyTemplateName.state,
  templateName
})

export const SavingTemplate = (): React.ReactNode => (
  <InfoTemplates.View
    template=""
    state={SavingTemplate.state}
    dispatch={action('dispatch')}
  />
)

SavingTemplate.state = {
  ...NonEmptyTemplateName.init(),
  savingTemplate: RemoteData.Optional.Loading
}

export const SavingTemplateFail = (): React.ReactNode => {
  const reason = text('Error message', 'Could not save it')

  return (
    <InfoTemplates.View
      template=""
      state={SavingTemplateFail.init(reason)}
      dispatch={action('dispatch')}
    />
  )
}

SavingTemplateFail.init = (reason: string) => ({
  ...NonEmptyTemplateName.init(),
  savingTemplate: RemoteData.Optional.Failure(reason)
})

export const ManyTemplates = (): React.ReactNode => {
  const templatesCount = number('Templates count', 20)

  return (
    <InfoTemplates.View
      template=""
      state={ManyTemplates.init(templatesCount)}
      dispatch={action('dispatch')}
    />
  )
}

ManyTemplates.init = (infoTemplatesCount: number) => ({
  ...InfoTemplates.initialState,
  infoTemplates: RemoteData.Succeed(
    range(infoTemplatesCount).map(index => ({
      name: `Template #${index}`,
      content: `Content #${index}`
    }))
  )
})

export const ManyTemplatesWithSavingError = (): React.ReactNode => (
  <InfoTemplates.View
    template=""
    state={ManyTemplatesWithSavingError.state}
    dispatch={action('dispatch')}
  />
)

ManyTemplatesWithSavingError.state = {
  ...ManyTemplates.init(10),
  savingTemplate: RemoteData.Optional.Failure('Could not save it')
}
