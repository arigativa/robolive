import React, { ReactNode } from 'react'
import {
  Container,
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
import { Agent, RoomConfiguration, getAgentList, joinRoom } from 'api'
import { SkeletonText, SkeletonRect } from 'Skeleton'
import { ActionOf, CaseOf, CaseCreator, range, match } from 'utils'

// S T A T E

type Join =
  | CaseOf<'NotJoin'>
  | CaseOf<'Joining', string>
  | CaseOf<'JoinFail', { robotId: string; message: string }>

const NotJoin: Join = CaseOf('NotJoin')()
const Joining: CaseCreator<Join> = CaseOf('Joining')
const JoinFail: CaseCreator<Join> = CaseOf('JoinFail')

export interface State {
  robots: RemoteData<string, Array<Agent>>
  join: Join
}

export const init: [State, Cmd<Action>] = [
  {
    robots: RemoteData.Loading,
    join: NotJoin
  },
  Cmd.create<Action>(done => getAgentList().then(LoadRobots).then(done))
]

// U P D A T E

export type Stage =
  | CaseOf<'Updated', [State, Cmd<Action>]>
  | CaseOf<'Joined', RoomConfiguration>

const Updated: CaseCreator<Stage> = CaseOf('Updated')
const Joined: CaseCreator<Stage> = CaseOf('Joined')

export type Action = ActionOf<[string, State], Stage>

const ReInit = ActionOf<Action>((_, __) => Updated(init))()

const LoadRobots = ActionOf<Either<string, Array<Agent>>, Action>(
  (result, _, state) =>
    Updated([
      {
        ...state,
        robots: RemoteData.fromEither(result)
      },
      Cmd.none
    ])
)

const SelectRobot = ActionOf<string, Action>((robotId, username, state) =>
  Updated([
    {
      ...state,
      join: Joining(robotId)
    },
    Cmd.create<Action>(done => {
      joinRoom({ username, robotId }).then(result =>
        done(SelectRobotDone(result.mapLeft(message => ({ robotId, message }))))
      )
    })
  ])
)

const SelectRobotDone = ActionOf<
  Either<
    {
      robotId: string
      message: string
    },
    RoomConfiguration
  >,
  Action
>((result, _, state) => {
  return result.fold<Stage>(
    error =>
      Updated([
        {
          ...state,
          join: JoinFail(error)
        },
        Cmd.none
      ]),
    Joined
  )
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

const AlertPanel: React.FC<{
  status: AlertStatus
  title?: string
}> = ({ status, title, children }) => (
  <Alert status={status}>
    <AlertIcon />
    {title && <AlertTitle>{title}</AlertTitle>}
    <AlertDescription>{children}</AlertDescription>
  </Alert>
)

const AgentItem = React.memo<{
  join: Join
  agent: Agent
  dispatch: Dispatch<Action>
}>(({ join, agent, dispatch }) => {
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

const AgentList = React.memo<{
  join: Join
  agentList: Array<Agent>
  dispatch: Dispatch<Action>
}>(({ join, agentList, dispatch }) => (
  <ViewAgentList>
    {agentList.map(agent => (
      <AgentItem key={agent.id} join={join} agent={agent} dispatch={dispatch} />
    ))}
  </ViewAgentList>
))

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => (
  <Container>
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
  </Container>
))

// S K E L E T O N

const SkeletonAgentItem = React.memo(() => (
  <ViewAgentItem name={<SkeletonText />} status={<SkeletonText />}>
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
