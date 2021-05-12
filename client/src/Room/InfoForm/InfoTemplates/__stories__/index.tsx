import React from 'react'
import { Story } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import RemoteData from 'frctl/RemoteData'
import { range } from 'utils'

import { InfoTemplate } from 'api'
import * as InfoTemplates from '..'

import parent from '../../InfoForm.story'

export default {
  title: `${parent.title} / InfoTemplates`
}

export const Skeleton: React.VFC = () => <InfoTemplates.Skeleton />

type InfoTemplatesStory = Story<InfoTemplates.State>

export const LoadingTemplates: InfoTemplatesStory = state => (
  <InfoTemplates.View template="" state={state} dispatch={action('dispatch')} />
)

LoadingTemplates.args = InfoTemplates.initialState

export const FailureTemplateLoading: InfoTemplatesStory = state => (
  <InfoTemplates.View template="" state={state} dispatch={action('dispatch')} />
)

FailureTemplateLoading.args = {
  ...InfoTemplates.initialState,
  infoTemplates: RemoteData.Failure('Something went wrong 🚨')
}

export const EmptyTemplateName: InfoTemplatesStory = state => (
  <InfoTemplates.View template="" state={state} dispatch={action('dispatch')} />
)

EmptyTemplateName.args = {
  ...InfoTemplates.initialState,
  infoTemplates: RemoteData.Succeed([])
}

export const NonEmptyTemplateName: InfoTemplatesStory = state => (
  <InfoTemplates.View template="" state={state} dispatch={action('dispatch')} />
)

NonEmptyTemplateName.args = {
  ...InfoTemplates.initialState,
  templateName: 'Rotate_180deg',
  infoTemplates: RemoteData.Succeed([])
}

export const SavingTemplate: InfoTemplatesStory = state => (
  <InfoTemplates.View template="" state={state} dispatch={action('dispatch')} />
)

SavingTemplate.args = {
  ...InfoTemplates.initialState,
  templateName: 'Rotate_180deg',
  savingTemplate: RemoteData.Optional.Loading,
  infoTemplates: RemoteData.Succeed([])
}

export const SavingTemplateFail: InfoTemplatesStory = state => (
  <InfoTemplates.View template="" state={state} dispatch={action('dispatch')} />
)

SavingTemplateFail.args = {
  ...InfoTemplates.initialState,
  templateName: 'Rotate_180deg',
  savingTemplate: RemoteData.Optional.Failure('Could not save it'),
  infoTemplates: RemoteData.Succeed([])
}

const makeInfoTemplates = (n: number): Array<InfoTemplate> => {
  return range(n).map(index => ({
    name: `Template #${index}`,
    content: `Content #${index}`
  }))
}

export const ManyTemplates: InfoTemplatesStory = state => (
  <InfoTemplates.View template="" state={state} dispatch={action('dispatch')} />
)

ManyTemplates.args = {
  ...InfoTemplates.initialState,
  infoTemplates: RemoteData.Succeed(makeInfoTemplates(20))
}

export const ManyTemplatesWithSavingError: InfoTemplatesStory = state => (
  <InfoTemplates.View template="" state={state} dispatch={action('dispatch')} />
)

ManyTemplatesWithSavingError.args = {
  ...ManyTemplates.args,
  savingTemplate: RemoteData.Optional.Failure('Could not save it')
}
