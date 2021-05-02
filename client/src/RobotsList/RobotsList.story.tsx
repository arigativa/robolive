import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, number, boolean } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData'

import { Agent } from 'api'
import { range } from 'utils'
import * as RobotsList from '.'

export default {
  title: 'RobotsList'
}

const [initialState] = RobotsList.init('test')

export const Skeleton: React.FC = () => <RobotsList.Skeleton />

export const Loading: React.FC = () => (
  <RobotsList.View
    state={{
      ...initialState,
      robots: RemoteData.Loading
    }}
    dispatch={action('dispatch')}
  />
)

export const Failure: React.FC = () => (
  <RobotsList.View
    state={{
      ...initialState,
      robots: RemoteData.Failure(text('Error message', 'Information not found'))
    }}
    dispatch={action('dispatch')}
  />
)

export const EmptyAgentList: React.FC = () => (
  <RobotsList.View
    state={{
      ...initialState,
      robots: RemoteData.Succeed([])
    }}
    dispatch={action('dispatch')}
  />
)

const createAgentId = (index: number): string => `id_${index}`
const createAgentName = (index: number): string => `Agent #${index}`

const createAgent = (index: number): Agent => ({
  id: createAgentId(index),
  name: createAgentName(index),
  status: `Status of Agent #${index}`,
  isAvailable: true
})

export const AgentList: React.FC = () => {
  const N = number('# of Agents', 3, {
    range: true,
    step: 1,
    min: 0,
    max: 100
  })

  return (
    <RobotsList.View
      state={{
        ...initialState,
        robots: RemoteData.Succeed(range(N).map(createAgent))
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const NotAvailableRobot: React.FC = () => (
  <RobotsList.View
    state={{
      ...initialState,
      robots: RemoteData.Succeed([
        {
          id: '0',
          name: 'Agent',
          status: `Status of Agent`,
          isAvailable: false
        }
      ])
    }}
    dispatch={action('dispatch')}
  />
)

export const WithRestreamUrl: React.FC = () => (
  <RobotsList.View
    state={{
      ...initialState,
      robots: RemoteData.Succeed([
        {
          id: '0',
          name: 'Agent',
          status: `Status of Agent`,
          isAvailable: boolean('isAvailable', true),
          restreamUrl: 'hAJV0WZtJvg'
        }
      ])
    }}
    dispatch={action('dispatch')}
  />
)
