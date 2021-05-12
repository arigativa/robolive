import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, number } from '@storybook/addon-knobs'

import {
  TemplateButton as TemplateButtonView,
  SkeletonTemplateButton
} from '..'

export default {
  title: 'Room / InfoForm / InfoTemplates / TemplateButton'
}

export const Skeleton: React.VFC = () => (
  <SkeletonTemplateButton width={number('Width', 180)} />
)

export const TemplateButton: React.VFC = () => (
  <TemplateButtonView
    onSubmit={action('onSubmit')}
    onDelete={action('onDelete')}
  >
    {text('Template name', 'Rotate left')}
  </TemplateButtonView>
)
