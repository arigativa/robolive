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

import { Cmd, Sub, Dispatch } from 'core'
import { Agent, RoomConfiguration, getAgentList, joinRoom } from 'api'
import { SkeletonText, SkeletonRect } from 'Skeleton'
import { ActionOf, CaseOf, CaseCreator, range, match, every } from 'utils'

// S T A T E

type JoinStatus =
  | CaseOf<'NotJoin'>
  | CaseOf<'Joining', string>
  | CaseOf<'JoinFail', { robotId: string; message: string }>

const NotJoin: JoinStatus = CaseOf('NotJoin')()
const Joining: CaseCreator<JoinStatus> = CaseOf('Joining')
const JoinFail: CaseCreator<JoinStatus> = CaseOf('JoinFail')

const isJoining = (joinStatus: JoinStatus): boolean => {
  return match(joinStatus, {
    Joining: () => true,
    _: () => false
  })
}

export interface State {
  robots: RemoteData<string, Array<Agent>>
  joinStatus: JoinStatus
  polling: boolean
}

export const initial: State = {
  robots: RemoteData.Loading,
  joinStatus: NotJoin,
  polling: false
}

export const init = (username: string): [State, Cmd<Action>] => [
  initial,
  Cmd.create<Action>(done =>
    getAgentList({ username }).then(LoadRobots).then(done)
  )
]

// U P D A T E

export type Stage =
  | CaseOf<'Updated', [State, Cmd<Action>]>
  | CaseOf<'Joined', RoomConfiguration>

const Updated: CaseCreator<Stage> = CaseOf('Updated')
const Joined: CaseCreator<Stage> = CaseOf('Joined')

export type Action = ActionOf<[string, State], Stage>

const ReInit = ActionOf<Action>((username, __) => Updated(init(username)))()

const LoadRobots = ActionOf<Either<string, Array<Agent>>, Action>(
  (result, _, state) =>
    Updated([
      {
        ...state,
        polling: false,
        robots:
          state.polling && result.isLeft()
            ? state.robots
            : RemoteData.fromEither(result)
      },
      Cmd.none
    ])
)

const SelectRobot = ActionOf<string, Action>((robotId, username, state) =>
  Updated([
    {
      ...state,
      joinStatus: Joining(robotId)
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
          joinStatus: JoinFail(error)
        },
        Cmd.none
      ]),
    Joined
  )
})

const RunPolling = ActionOf<Action>((username, state) =>
  Updated([
    { ...state, polling: true },
    Cmd.create<Action>(done =>
      getAgentList({ username }).then(LoadRobots).then(done)
    )
  ])
)()

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (
    state.polling ||
    isJoining(state.joinStatus) ||
    state.robots.getOrElse([]).length === 0
  ) {
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
  joinStatus: JoinStatus
  agent: Agent
  dispatch: Dispatch<Action>
}>(({ joinStatus, agent, dispatch }) => {
  const [disabled, loading, error]: [boolean, boolean, null | string] = match(
    joinStatus,
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
    <ViewAgentItem
      name={agent.name}
      status={agent.status}
      isAvailableForConnection={String(agent.isAvailableForConnection)}
    >
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
  joinStatus: JoinStatus
  agentList: Array<Agent>
  dispatch: Dispatch<Action>
}>(({ joinStatus, agentList, dispatch }) => (
  <ViewAgentList>
    {agentList.map(agent => (
      <AgentItem
        key={agent.id}
        joinStatus={joinStatus}
        agent={agent}
        dispatch={dispatch}
      />
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
            joinStatus={state.joinStatus}
            agentList={agentList}
            dispatch={dispatch}
          />
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
  <Container>
    <SkeletonAgentList />
  </Container>
))
