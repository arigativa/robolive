import React from 'react'
import { boolean, text } from '@storybook/addon-knobs'
import { action } from '@storybook/addon-actions'
import AppBar from '@material-ui/core/AppBar'

import * as TopBar from './index'

export default {
  title: 'App . TopBar',
  component: TopBar.View
}

const ViewContainer: React.FC = ({ children }) => {
  if (boolean('Wrap to AppBar', true)) {
    return <AppBar>{children}</AppBar>
  }

  return <>{children}</>
}

export const Default: React.FC = () => (
  <ViewContainer>
    <TopBar.View
      state={TopBar.initial(text('Initial City', 'London'))}
      dispatch={action('dispatch')}
    />
  </ViewContainer>
)

export const Skeleton: React.FC = () => (
  <ViewContainer>
    <TopBar.Skeleton />
  </ViewContainer>
)
