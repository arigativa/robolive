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

export const LoadingTemplates = (): JSX.Element => (
  <InfoTemplates.View
    template=""
    state={LoadingTemplates.state}
    dispatch={action('dispatch')}
  />
)

LoadingTemplates.state = InfoTemplates.initialState

export const FailureTemplateLoading = (): JSX.Element => {
  const message = text('Error message', 'Something went wrong 🚨')

  return (
    <InfoTemplates.View
      template=""
      state={FailureTemplateLoading.init(message)}
      dispatch={action('dispatch')}
    />
  )
}

FailureTemplateLoading.init = (message = 'Something went wrong 🚨') => ({
  ...InfoTemplates.initialState,
  infoTemplates: RemoteData.Failure(message)
})

export const EmptyTemplateName = (): JSX.Element => (
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

export const NonEmptyTemplateName = (): JSX.Element => {
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

export const SavingTemplate = (): JSX.Element => (
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

export const SavingTemplateFail = (): JSX.Element => {
  const message = text('Error message', 'Could not save it')

  return (
    <InfoTemplates.View
      template=""
      state={SavingTemplateFail.init(message)}
      dispatch={action('dispatch')}
    />
  )
}

SavingTemplateFail.init = (message = 'Could not save it') => ({
  ...NonEmptyTemplateName.init(),
  savingTemplate: RemoteData.Optional.Failure(message)
})

export const ManyTemplates = (): JSX.Element => {
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

export const ManyTemplatesWithSavingError = (): JSX.Element => (
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
