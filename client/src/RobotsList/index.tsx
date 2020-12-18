import React, { ReactNode } from 'react'
import {
  Heading,
  Text,
  Box,
  VStack,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData'

import { ActionOf, Cmd, Dispatch } from 'core'
import { Agent, getAgentList } from 'api'
import { SkeletonText, SkeletonRect } from 'Skeleton'
import { range } from 'utils'

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

export type Action = ActionOf<[State], [State, Cmd<Action>]>

const LoadRobots = ActionOf<Either<string, Array<Agent>>, Action>(
  (result, state) => [
    {
      ...state,
      robots: RemoteData.fromEither(result)
    },
    Cmd.none
  ]
)

// V I E W

const ViewAgentItem: React.FC<{
  name: ReactNode
  status: ReactNode
}> = ({ name, status, children }) => (
  <Box
    p="5"
    width="100%"
    shadow="md"
    borderWidth="1"
    borderRadius="md"
    wordBreak="break-all"
  >
    <Heading fontSize="xl">{name}</Heading>

    <Text mt="2" size="sm">
      {status}
    </Text>

    <Box mt="3">{children}</Box>
  </Box>
)

const ViewAgentList: React.FC = ({ children }) => (
  <VStack align="start">{children}</VStack>
)

const EmptyAgentList = React.memo(() => (
  <div>No agents found. Please try later.</div>
))

const FailedRequestAlert = React.memo(({ children }) => (
  <Alert status="error">
    <AlertIcon />
    <AlertTitle>Request Error!</AlertTitle>
    <AlertDescription>{children}</AlertDescription>
  </Alert>
))

const AgentItem: React.FC<{
  agent: Agent
}> = React.memo(({ agent }) => (
  <ViewAgentItem name={agent.name} status={agent.status}>
    <Button size="sm" bg="blue.100">
      Select
    </Button>
  </ViewAgentItem>
))

const AgentList: React.FC<{
  agentList: Array<Agent>
}> = React.memo(({ agentList }) => (
  <ViewAgentList>
    {agentList.map(agent => (
      <AgentItem key={agent.id} agent={agent} />
    ))}
  </ViewAgentList>
))

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = React.memo(({ state, dispatch }) => (
  <Box p="4">
    {state.robots.cata({
      Loading: () => <SkeletonAgentList />,

      Failure: message => <FailedRequestAlert>{message}</FailedRequestAlert>,

      Succeed: agentList =>
        agentList.length === 0 ? (
          <EmptyAgentList />
        ) : (
          <AgentList agentList={agentList} />
        )
    })}
  </Box>
))

// S K E L E T O N

const SkeletonAgentItem: React.FC = React.memo(() => (
  <ViewAgentItem name={<SkeletonText />} status={<SkeletonText />}>
    <SkeletonRect width="66px" height="32px" rounded="6px" />
  </ViewAgentItem>
))

const SkeletonAgentList: React.FC<{
  count?: number
}> = React.memo(({ count = 3 }) => (
  <ViewAgentList>
    {range(count).map(index => (
      <SkeletonAgentItem key={index} />
    ))}
  </ViewAgentList>
))
