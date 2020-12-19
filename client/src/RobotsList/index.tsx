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

import { Cmd, Dispatch } from 'core'
import { Agent, getAgentList, joinRoom } from 'api'
import { SkeletonText, SkeletonRect } from 'Skeleton'
import { ActionOf, range, caseOf, match } from 'utils'

// S T A T E

type Join =
  | typeof NotJoin
  | ReturnType<typeof Joining>
  | ReturnType<typeof JoinFail>

const NotJoin = caseOf('NotJoin')()
const Joining = caseOf<'Joining', string>('Joining')
const JoinFail = caseOf<'JoinFail', string>('JoinFail')

export type State = {
  robots: RemoteData<string, Array<Agent>>
  join: Join
}

export const init: [State, Cmd<Action>] = [
  {
    robots: RemoteData.Loading,
    join: NotJoin
  },
  Cmd.create(done => {
    getAgentList().then(result => done(LoadRobots(result)))
  })
]

// U P D A T E

export type Action = ActionOf<[string, State], [State, Cmd<Action>]>

const LoadRobots = ActionOf<Either<string, Array<Agent>>, Action>(
  (result, _, state) => [
    {
      ...state,
      robots: RemoteData.fromEither(result)
    },
    Cmd.none
  ]
)

const SelectRobot = ActionOf<string, Action>((robotId, username, state) => [
  {
    ...state,
    join: Joining(robotId)
  },
  Cmd.create(done => {
    joinRoom({ username, robotId }).then(result =>
      done(SelectRobotDone(result))
    )
  })
])

const SelectRobotDone = ActionOf<
  Either<string, Array<[string, string]>>,
  Action
>((result, _, state) => {
  return [
    result.fold(
      message => ({
        ...state,
        join: JoinFail(message)
      }),
      () => state
    ),
    Cmd.none
  ]
})

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

const ErrorAlert: React.FC<{ title: string }> = ({ title, children }) => (
  <Alert status="error">
    <AlertIcon />
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>{children}</AlertDescription>
  </Alert>
)

const AgentItem: React.FC<{
  join: Join
  agent: Agent
  dispatch: Dispatch<Action>
}> = React.memo(({ join, agent, dispatch }) => {
  const [joining, error]: [boolean, null | string] = match(join, {
    NotJoin: () => [false, null],
    Joining: () => [true, null],
    JoinFail: message => [false, message]
  })

  return (
    <ViewAgentItem name={agent.name} status={agent.status}>
      {error && <ErrorAlert title="Joining fail">{error}</ErrorAlert>}

      <Button
        size="sm"
        bg="blue.100"
        disabled={joining}
        onClick={() => dispatch(SelectRobot(agent.id))}
      >
        Select
      </Button>
    </ViewAgentItem>
  )
})

const AgentList: React.FC<{
  join: Join
  agentList: Array<Agent>
  dispatch: Dispatch<Action>
}> = React.memo(({ join, agentList, dispatch }) => (
  <ViewAgentList>
    {agentList.map(agent => (
      <AgentItem key={agent.id} join={join} agent={agent} dispatch={dispatch} />
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

      Failure: message => (
        <ErrorAlert title="Request Error!">{message}</ErrorAlert>
      ),

      Succeed: agentList =>
        agentList.length === 0 ? (
          <EmptyAgentList />
        ) : (
          <AgentList
            join={state.join}
            agentList={agentList}
            dispatch={dispatch}
          />
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
