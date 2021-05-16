import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, number, boolean } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData'

import { range } from 'utils'
import * as RobotsList from '..'

export default {
  title: 'RobotsList'
}

export const Skeleton: React.FC = () => <RobotsList.Skeleton />

export const Loading = (): React.ReactNode => (
  <RobotsList.View state={Loading.state} dispatch={action('dispatch')} />
)

Loading.state = RobotsList.initialState

export const Failure = (): React.ReactNode => {
  const reason = text('Error message', 'Information not found')

  return (
    <RobotsList.View
      state={Failure.init(reason)}
      dispatch={action('dispatch')}
    />
  )
}

Failure.init = (reason: string) => ({
  ...RobotsList.initialState,
  robots: RemoteData.Failure(reason)
})

export const EmptyAgentList = (): React.ReactNode => (
  <RobotsList.View state={EmptyAgentList.state} dispatch={action('dispatch')} />
)

EmptyAgentList.state = {
  ...RobotsList.initialState,
  robots: RemoteData.Succeed([])
}

export const AgentList = (): React.ReactNode => {
  const robotsCount = number('# of Agents', 3, {
    range: true,
    step: 1,
    min: 0,
    max: 100
  })

  return (
    <RobotsList.View
      state={AgentList.init(robotsCount)}
      dispatch={action('dispatch')}
    />
  )
}

AgentList.init = (robotsCount: number) => ({
  ...RobotsList.initialState,
  robots: RemoteData.Succeed(
    range(robotsCount).map(index => ({
      id: index.toString(),
      name: `Agent #${index}`,
      status: `Status of Agent #${index}`,
      isAvailable: true
    }))
  )
})

export const NotAvailableRobot = (): React.ReactNode => (
  <RobotsList.View
    state={NotAvailableRobot.state}
    dispatch={action('dispatch')}
  />
)

NotAvailableRobot.state = {
  ...RobotsList.initialState,
  robots: RemoteData.Succeed([
    {
      id: '0',
      name: 'Agent',
      status: `Status of Agent`,
      isAvailable: false
    }
  ])
}

export const WithRestreamUrl = (): React.ReactNode => (
  <RobotsList.View
    state={WithRestreamUrl.state}
    dispatch={action('dispatch')}
  />
)

WithRestreamUrl.state = {
  ...RobotsList.initialState,
  robots: RemoteData.Succeed([
    {
      id: '0',
      name: 'Agent',
      status: `Status of Agent`,
      isAvailable: true,
      restreamUrl: boolean('show stream', true) ? 'hAJV0WZtJvg' : undefined
    }
  ])
}
