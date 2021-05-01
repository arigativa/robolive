import React, { ReactNode } from 'react'
import { Container, Heading, Text, Box, VStack, Button } from '@chakra-ui/react'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData'

import { Cmd, Sub, Dispatch } from 'core'
import { Agent, getAgentList } from 'api'
import { SkeletonText, SkeletonRect } from 'Skeleton'
import { AlertPanel } from 'AlertPanel'
import { Case, range, every } from 'utils'

// S T A T E

export interface State {
  robots: RemoteData<string, Array<Agent>>
  polling: boolean
}

export const init = (username: string): [State, Cmd<Action>] => [
  {
    robots: RemoteData.Loading,
    polling: false
  },
  Cmd.create<Action>(done => {
    getAgentList({ username })
      .then(result => LoadRobots({ result }))
      .then(done)
  })
]

// U P D A T E

export type Stage =
  | Case<'Updated', { state: State; cmd: Cmd<Action> }>
  | Case<'JoinToRoom', { robotId: string }>

const Updated = (state: State, cmd: Cmd<Action>): Stage => ({
  type: 'Updated',
  state,
  cmd
})
const JoinToRoom = Case.of<Stage, 'JoinToRoom'>('JoinToRoom')

export type Action =
  | Case<'ReInit'>
  | Case<'RunPolling'>
  | Case<'LoadRobots', { result: Either<string, Array<Agent>> }>
  | Case<'SelectRobot', { robotId: string }>

const ReInit = Case.of<Action, 'ReInit'>('ReInit')()
const RunPolling = Case.of<Action, 'RunPolling'>('RunPolling')()
const LoadRobots = Case.of<Action, 'LoadRobots'>('LoadRobots')
const SelectRobot = Case.of<Action, 'SelectRobot'>('SelectRobot')

export const update = (
  action: Action,
  username: string,
  state: State
): Stage => {
  switch (action.type) {
    case 'ReInit': {
      const [initialState, initialCmd] = init(username)

      return Updated(initialState, initialCmd)
    }

    case 'RunPolling': {
      return Updated(
        { ...state, polling: true },

        Cmd.create<Action>(done =>
          getAgentList({ username })
            .then(result => LoadRobots({ result }))
            .then(done)
        )
      )
    }

    case 'LoadRobots': {
      return Updated(
        {
          ...state,
          polling: false,
          robots:
            state.polling && action.result.isLeft()
              ? state.robots
              : RemoteData.fromEither(action.result)
        },
        Cmd.none
      )
    }

    case 'SelectRobot': {
      return JoinToRoom({ robotId: action.robotId })
    }
  }
}

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (state.polling || state.robots.getOrElse([]).length === 0) {
    return Sub.none
  }

  return every(2000, () => RunPolling)
}

// V I E W

const ViewAgentItem: React.FC<{
  name: ReactNode
  status: ReactNode
  isAvailableForConnection: ReactNode
}> = ({ name, status, isAvailableForConnection, children }) => (
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

    <Text mt="3" size="sm">
      {isAvailableForConnection}
    </Text>
    <Box mt="4">{children}</Box>
  </Box>
)

const ViewAgentList: React.FC = ({ children }) => (
  <VStack align="start">{children}</VStack>
)

const EmptyAgentList = React.memo<{
  dispatch: Dispatch<Action>
}>(({ dispatch }) => (
  <AlertPanel status="info">
    No agents found. Please try later or{' '}
    <Button
      verticalAlign="baseline"
      variant="link"
      colorScheme="teal"
      onClick={() => dispatch(ReInit)}
    >
      retry now
    </Button>
  </AlertPanel>
))

const AgentItem = React.memo<{
  agent: Agent
  dispatch: Dispatch<Action>
}>(({ agent, dispatch }) => (
  <ViewAgentItem
    name={agent.name}
    status={agent.status}
    isAvailableForConnection={String(agent.isAvailableForConnection)}
  >
    <Button
      size="sm"
      colorScheme="teal"
      onClick={() => dispatch(SelectRobot({ robotId: agent.id }))}
    >
      Select
    </Button>
  </ViewAgentItem>
))

const AgentList = React.memo<{
  agentList: Array<Agent>
  dispatch: Dispatch<Action>
}>(({ agentList, dispatch }) => (
  <ViewAgentList>
    {agentList.map(agent => (
      <AgentItem key={agent.id} agent={agent} dispatch={dispatch} />
    ))}
  </ViewAgentList>
))

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => (
  <Container py="4">
    {state.robots.cata({
      Loading: () => <SkeletonAgentList />,

      Failure: message => (
        <AlertPanel status="error" title="Request Error!">
          {message}
        </AlertPanel>
      ),

      Succeed: agentList =>
        agentList.length === 0 ? (
          <EmptyAgentList dispatch={dispatch} />
        ) : (
          <AgentList agentList={agentList} dispatch={dispatch} />
        )
    })}
  </Container>
))

// S K E L E T O N

const SkeletonAgentItem = React.memo(() => (
  <ViewAgentItem
    name={<SkeletonText />}
    status={<SkeletonText />}
    isAvailableForConnection={<SkeletonText />}
  >
    <SkeletonRect width="66px" height="32px" rounded="6px" />
  </ViewAgentItem>
))

const SkeletonAgentList = React.memo<{
  count?: number
}>(({ count = 3 }) => (
  <ViewAgentList>
    {range(count).map(index => (
      <SkeletonAgentItem key={index} />
    ))}
  </ViewAgentList>
))

export const Skeleton = React.memo(() => (
  <Container py="4">
    <SkeletonAgentList />
  </Container>
))
