import React from 'react'
import { action } from '@storybook/addon-actions'
import { text, number, radios } from '@storybook/addon-knobs'
import RemoteData from 'frctl/RemoteData'

import { Agent } from 'api'
import { range } from 'utils'
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

const createAgentId = (index: number): string => `id_${index}`
const createAgentName = (index: number): string => `Agent #${index}`

const createAgent = (index: number): Agent => ({
  id: createAgentId(index),
  name: createAgentName(index),
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
        robots: RemoteData.Succeed(range(N).map(createAgent))
      }}
      dispatch={action('dispatch')}
    />
  )
}

const agentsRadios = (title: string, N: number, initial: number): string => {
  return radios(
    title,
    range(N).reduce(
      (acc, index) => ({
        ...acc,
        [createAgentName(index)]: createAgentId(index)
      }),
      {}
    ),
    createAgentId(initial)
  )
}

export const Joining: React.FC = () => {
  const robotId = agentsRadios('Id of joining Robot', 3, 1)

  return (
    <RobotsList.View
      state={{
        ...initialState,
        joinStatus: { type: 'Joining', payload: robotId },
        robots: RemoteData.Succeed(range(3).map(createAgent))
      }}
      dispatch={action('dispatch')}
    />
  )
}

export const JoinFail: React.FC = () => {
  const robotId = agentsRadios('Id of joining Robot', 3, 1)
  const message = text(
    'Failure message',
    'Method not found: ClientEndpoint/Join'
  )

  return (
    <RobotsList.View
      state={{
        ...initialState,
        joinStatus: {
          type: 'JoinFail',
          payload: { robotId, message }
        },
        robots: RemoteData.Succeed(range(3).map(createAgent))
      }}
      dispatch={action('dispatch')}
    />
  )
}
