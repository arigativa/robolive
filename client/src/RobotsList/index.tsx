import React from 'react'
import { Heading, Text, Box, VStack, Button } from '@chakra-ui/react'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData'

import { Cmd, Dispatch, caseOf, match } from 'core'
import { Agent, getAgentList } from 'api'

// S T A T E

export type State = {
  robots: RemoteData<string, Array<Agent>>
}

export const init: [State, Cmd<Action>] = [
  {
    robots: RemoteData.Loading
  },
  Cmd.create(done =>
    getAgentList().then(result =>
      done(LoadRobots(result.mapLeft(error => error.message)))
    )
  )
]

// U P D A T E

export type Action = ReturnType<typeof LoadRobots>

const LoadRobots = caseOf<'LoadRobots', Either<string, Array<Agent>>>(
  'LoadRobots'
)

export const update = (action: Action, state: State): [State, Cmd<Action>] => {
  return match(action, {
    LoadRobots: result => [
      {
        ...state,
        robots: RemoteData.fromEither(result)
      },
      Cmd.none
    ]
  })
}

// V I E W

const ViewEmptyAgentList = React.memo(() => (
  <div>No agents found. Please try later.</div>
))

const ViewAgentItem: React.FC<{
  agent: Agent
}> = React.memo(({ agent }) => (
  <Box
    p="5"
    shadow="md"
    borderWidth="1"
    borderRadius="md"
    wordBreak="break-all"
  >
    <Heading fontSize="xl">{agent.name}</Heading>

    <Text mt="2" size="sm">
      {agent.status}
    </Text>

    <Button mt="3" size="sm" bg="blue.100">
      Select
    </Button>
  </Box>
))

const ViewAgentList: React.FC<{
  agentList: Array<Agent>
}> = React.memo(({ agentList }) => (
  <VStack align="start">
    {agentList.map(agent => (
      <ViewAgentItem key={agent.id} agent={agent} />
    ))}
  </VStack>
))

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = React.memo(({ state, dispatch }) => (
  <Box p="4">
    {state.robots.cata({
      Loading: () => <div>Loading</div>,

      Failure: message => <div>Error: {message}</div>,

      Succeed: agentList =>
        agentList.length === 0 ? (
          <ViewEmptyAgentList />
        ) : (
          <ViewAgentList agentList={agentList} />
        )
    })}
  </Box>
))
