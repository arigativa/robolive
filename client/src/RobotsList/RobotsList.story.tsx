import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, number } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData'

import { Agent } from 'api'
import * as RobotsList from '.'

export default {
  title: 'RobotsList'
}

const [initialState] = RobotsList.init

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

const createAgent = (index: number): Agent => ({
  id: `id_${index}`,
  name: `Agent #${index}`,
  status: `Status of Agent #${index}`
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
        robots: RemoteData.Succeed(
          Array(N)
            .fill(0)
            .map((_, index) => createAgent(index))
        )
      }}
      dispatch={action('dispatch')}
    />
  )
}
