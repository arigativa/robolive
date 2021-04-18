import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, boolean } from '@storybook/addon-knobs'

import * as SaveTemplate from '.'

export default {
  title: 'SaveTemplate'
}

export const Initial: React.FC = () => (
  <SaveTemplate.View
    template=""
    state={SaveTemplate.initial}
    dispatch={action('dispatch')}
  />
)

export const NameIsPresent: React.FC = () => (
  <SaveTemplate.View
    template=""
    state={{
      ...SaveTemplate.initial,
      name: text('Button name', 'ROTATE_LEFT')
    }}
    dispatch={action('dispatch')}
  />
)

export const Saving: React.FC = () => (
  <SaveTemplate.View
    template=""
    state={{
      ...SaveTemplate.initial,
      name: 'ROTATE_LEFT',
      saving: boolean('Saving', true)
    }}
    dispatch={action('dispatch')}
  />
)
