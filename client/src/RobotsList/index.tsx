import React, { ReactNode } from 'react'
import {
  Heading,
  Text,
  Box,
  VStack,
  Button,
  Alert,
  AlertStatus,
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
const JoinFail = caseOf<
  'JoinFail',
  {
    robotId: string
    message: string
  }
>('JoinFail')

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

const ReInit = ActionOf<Action>((_, __) => init)()

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
      done(SelectRobotDone(result.mapLeft(message => ({ robotId, message }))))
    )
  })
])

const SelectRobotDone = ActionOf<
  Either<
    {
      robotId: string
      message: string
    },
    Array<[string, string]>
  >,
  Action
>((result, _, state) => {
  return [
    result.fold(
      error => ({
        ...state,
        join: JoinFail(error)
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

const EmptyAgentList: React.FC<{
  dispatch: Dispatch<Action>
}> = React.memo(({ dispatch }) => (
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

const AlertPanel: React.FC<{ status: AlertStatus; title?: string }> = ({
  status,
  title,
  children
}) => (
  <Alert status={status}>
    <AlertIcon />
    {title && <AlertTitle>{title}</AlertTitle>}
    <AlertDescription>{children}</AlertDescription>
  </Alert>
)

const AgentItem: React.FC<{
  join: Join
  agent: Agent
  dispatch: Dispatch<Action>
}> = React.memo(({ join, agent, dispatch }) => {
  const [disabled, loading, error]: [boolean, boolean, null | string] = match(
    join,
    {
      NotJoin: () => [false, false, null],
      Joining: robotId => [true, agent.id === robotId, null],
      JoinFail: ({ robotId, message }) => [
        false,
        false,
        agent.id === robotId ? message : null
      ]
    }
  )

  return (
    <ViewAgentItem name={agent.name} status={agent.status}>
      {error && (
        <Box mb="2">
          <AlertPanel status="error" title="Joining Failure">
            {error}
          </AlertPanel>
        </Box>
      )}

      <Button
        size="sm"
        colorScheme="teal"
        isDisabled={disabled}
        isLoading={loading}
        onClick={() => dispatch(SelectRobot(agent.id))}
      >
        {error ? 'Try again' : 'Select'}
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
        <AlertPanel status="error" title="Request Error!">
          {message}
        </AlertPanel>
      ),

      Succeed: agentList =>
        agentList.length === 0 ? (
          <EmptyAgentList dispatch={dispatch} />
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
