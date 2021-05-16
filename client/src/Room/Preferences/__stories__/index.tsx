import React from 'react'
import { action } from '@storybook/addon-actions'
import Maybe from 'frctl/Maybe'

import * as Preferences from '..'

export default {
  title: 'Room / Preferences'
}

export const Skeleton: React.VFC = () => <Preferences.Skeleton />

export const Initial = (): JSX.Element => (
  <Preferences.View state={Initial.state} dispatch={action('dispatch')} />
)

Initial.state = Preferences.initialState

export const Defaults = (): JSX.Element => (
  <Preferences.View state={Defaults.state} dispatch={action('dispatch')} />
)

Defaults.state = Maybe.Just(Preferences.Preferences.defaults)

export const HideTextarea = (): JSX.Element => (
  <Preferences.View state={HideTextarea.state} dispatch={action('dispatch')} />
)

HideTextarea.state = Maybe.Just({
  showTextarea: false,
  showTemplates: true,
  showInfoLog: true
})

export const HideTemplates = (): JSX.Element => (
  <Preferences.View state={HideTemplates.state} dispatch={action('dispatch')} />
)

HideTemplates.state = Maybe.Just({
  showTextarea: true,
  showTemplates: false,
  showInfoLog: true
})

export const HideInfoLog = (): JSX.Element => (
  <Preferences.View state={HideInfoLog.state} dispatch={action('dispatch')} />
)

HideInfoLog.state = Maybe.Just({
  showTextarea: true,
  showTemplates: true,
  showInfoLog: false
})

export const HideAll = (): JSX.Element => (
  <Preferences.View state={HideAll.state} dispatch={action('dispatch')} />
)

HideAll.state = Maybe.Just({
  showTextarea: false,
  showTemplates: false,
  showInfoLog: false
})
