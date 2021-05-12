import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, number } from '@storybook/addon-knobs'

import { TemplateButton as TemplateButtonView, SkeletonTemplateButton } from '.'

import parent from '../InfoTemplates.story'

export default {
  title: `${parent.title} / TemplateButton`
}

export const Skeleton: React.VFC = () => (
  <SkeletonTemplateButton width={number('Width', 180)} />
)

export const TemplateButton: React.VFC = () => (
  <TemplateButtonView
    template={{
      name: text('Template name', 'Rotate left'),
      content: text('Template content', '{"rotate":"90deg"}')
    }}
    onSubmit={action('onSubmit')}
    onDelete={action('onDelete')}
  />
)
