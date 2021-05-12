import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, boolean, number } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData'
import { range } from 'utils'

import { InfoTemplate } from 'api'
import * as InfoTemplates from '.'

import parent from '../InfoForm.story'

export default {
  title: `${parent.title} / InfoTemplates`
}

export const Skeleton: React.FC = () => <InfoTemplates.Skeleton />

export const LoadingTemplates: React.FC = () => (
  <InfoTemplates.View
    template=""
    state={InfoTemplates.initialState}
    dispatch={action('dispatch')}
  />
)

export const FailureTemplateLoading: React.FC = () => (
  <InfoTemplates.View
    template=""
    state={{
      ...InfoTemplates.initialState,
      infoTemplates: RemoteData.Failure(
        text('Error message', 'Something went wrong 🚨')
      )
    }}
    dispatch={action('dispatch')}
  />
)

export const EmptyTemplateName: React.FC = () => (
  <InfoTemplates.View
    template=""
    state={{
      ...InfoTemplates.initialState,
      infoTemplates: RemoteData.Succeed([])
    }}
    dispatch={action('dispatch')}
  />
)

export const NonEmptyTemplateName: React.FC = () => (
  <InfoTemplates.View
    template=""
    state={{
      ...InfoTemplates.initialState,
      templateName: text('Template name', 'Rotate_180deg'),
      infoTemplates: RemoteData.Succeed([])
    }}
    dispatch={action('dispatch')}
  />
)

export const SavingTemplate: React.FC = () => (
  <InfoTemplates.View
    template=""
    state={{
      ...InfoTemplates.initialState,
      templateName: 'Rotate_180deg',
      savingTemplate: boolean('Saving ON', true)
        ? RemoteData.Optional.Loading
        : RemoteData.Optional.NotAsked,
      infoTemplates: RemoteData.Succeed([])
    }}
    dispatch={action('dispatch')}
  />
)

export const SavingTemplateFail: React.FC = () => (
  <InfoTemplates.View
    template=""
    state={{
      ...InfoTemplates.initialState,
      templateName: 'Rotate_180deg',
      savingTemplate: RemoteData.Optional.Failure(
        text('Saving error', 'Could not save it')
      ),
      infoTemplates: RemoteData.Succeed([])
    }}
    dispatch={action('dispatch')}
  />
)

const makeTemplates = (n: number, template: string): Array<InfoTemplate> => {
  return range(n).map(i => ({
    name: template.replace('{i}', i.toString()),
    content: `Content #${i}`
  }))
}

export const ManyTemplates: React.FC = () => {
  const template = text('Template pattern', 'Template #{i}')

  const nTemplates = number('# of templates', 6, {
    range: true,
    min: 0,
    max: 20
  })

  return (
    <InfoTemplates.View
      template=""
      state={{
        ...InfoTemplates.initialState,
        infoTemplates: RemoteData.Succeed(makeTemplates(nTemplates, template))
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const ManyTemplatesWithSavingError: React.FC = () => {
  return (
    <InfoTemplates.View
      template=""
      state={{
        ...InfoTemplates.initialState,
        savingTemplate: RemoteData.Optional.Failure('Could not save it'),
        infoTemplates: RemoteData.Succeed(makeTemplates(20, 'Template #{i}'))
      }}
      dispatch={action('dispatch')}
    />
  )
}
