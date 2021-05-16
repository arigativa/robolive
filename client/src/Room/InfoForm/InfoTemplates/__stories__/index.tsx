import React from 'react'
import { action } from '@storybook/addon-actions'
import { number, text } from '@storybook/addon-knobs'
import { VStack } from '@chakra-ui/react'
import RemoteData from 'frctl/RemoteData'
import { range } from 'utils'

import * as InfoTemplates from '..'

export default {
  title: 'Room / InfoForm / InfoTemplates'
}

export const Skeleton: React.VFC = () => (
  <VStack spacing="4" alignItems="stretch">
    <InfoTemplates.SkeletonInput />
    <InfoTemplates.SkeletonButtons />
  </VStack>
)

const ViewCombined: React.VFC<{
  state: InfoTemplates.State
}> = ({ state }) => (
  <VStack spacing="4" alignItems="stretch">
    <InfoTemplates.ViewInput
      content=""
      state={state}
      dispatch={action('dispatch')}
    />
    <InfoTemplates.ViewButtons state={state} dispatch={action('dispatch')} />
  </VStack>
)

export const LoadingTemplates = (): React.ReactNode => (
  <ViewCombined state={LoadingTemplates.state} />
)

LoadingTemplates.state = InfoTemplates.initialState

export const FailureTemplateLoading = (): React.ReactNode => {
  const reason = text('Error message', 'Something went wrong 🚨')

  return <ViewCombined state={FailureTemplateLoading.init(reason)} />
}

FailureTemplateLoading.init = (reason: string) => ({
  ...InfoTemplates.initialState,
  infoTemplates: RemoteData.Failure(reason)
})

export const EmptyTemplateName = (): React.ReactNode => (
  <ViewCombined state={EmptyTemplateName.state} />
)

EmptyTemplateName.state = {
  ...InfoTemplates.initialState,
  infoTemplates: RemoteData.Succeed([])
}

export const NonEmptyTemplateName = (): React.ReactNode => {
  const templateName = text('Template name', 'Rotate_180deg')

  return <ViewCombined state={NonEmptyTemplateName.init(templateName)} />
}

NonEmptyTemplateName.init = (templateName = 'Rotate_180deg') => ({
  ...EmptyTemplateName.state,
  templateName
})

export const SavingTemplate = (): React.ReactNode => (
  <ViewCombined state={SavingTemplate.state} />
)

SavingTemplate.state = {
  ...NonEmptyTemplateName.init(),
  savingTemplate: RemoteData.Optional.Loading
}

export const SavingTemplateFail = (): React.ReactNode => {
  const reason = text('Error message', 'Could not save it')

  return <ViewCombined state={SavingTemplateFail.init(reason)} />
}

SavingTemplateFail.init = (reason: string) => ({
  ...NonEmptyTemplateName.init(),
  savingTemplate: RemoteData.Optional.Failure(reason)
})

export const ManyTemplates = (): React.ReactNode => {
  const templatesCount = number('Templates count', 20)

  return <ViewCombined state={ManyTemplates.init(templatesCount)} />
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
  <ViewCombined state={ManyTemplatesWithSavingError.state} />
)

ManyTemplatesWithSavingError.state = {
  ...ManyTemplates.init(10),
  savingTemplate: RemoteData.Optional.Failure('Could not save it')
}
