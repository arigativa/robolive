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
import { Case, range, every } from 'utils'

// S T A T E

type JoinStatus =
  | Case<'NotJoin'>
  | Case<'Joining', string>
  | Case<'JoinFail', { robotId: string; message: string }>

export const NotJoin = Case.of<JoinStatus, 'NotJoin'>('NotJoin')()
export const Joining = Case.of<JoinStatus, 'Joining'>('Joining')
export const JoinFail = Case.of<JoinStatus, 'JoinFail'>('JoinFail')

export interface State {
  robots: RemoteData<string, Array<Agent>>
  joinStatus: JoinStatus
  polling: boolean
}

export const init = (username: string): [State, Cmd<Action>] => [
  {
    robots: RemoteData.Loading,
    joinStatus: NotJoin,
    polling: false
  },
  Cmd.create<Action>(done =>
    getAgentList({ username }).then(LoadRobots).then(done)
  )
]

// U P D A T E

export type Stage =
  | Case<'Updated', [State, Cmd<Action>]>
  | Case<'Joined', RoomConfiguration>

const Updated = Case.of<Stage, 'Updated'>('Updated')
const Joined = Case.of<Stage, 'Joined'>('Joined')

export type Action =
  | Case<'ReInit'>
  | Case<'RunPolling'>
  | Case<'LoadRobots', Either<string, Array<Agent>>>
  | Case<'SelectRobot', string>
  | Case<
      'SelectRobotDone',
      Either<{ robotId: string; message: string }, RoomConfiguration>
    >

const ReInit = Case.of<Action, 'ReInit'>('ReInit')()
const RunPolling = Case.of<Action, 'RunPolling'>('RunPolling')()
const LoadRobots = Case.of<Action, 'LoadRobots'>('LoadRobots')
const SelectRobot = Case.of<Action, 'SelectRobot'>('SelectRobot')
const SelectRobotDone = Case.of<Action, 'SelectRobotDone'>('SelectRobotDone')

export const update = (
  action: Action,
  username: string,
  state: State
): Stage => {
  switch (action.type) {
    case 'ReInit': {
      return Updated(init(username))
    }

    case 'RunPolling': {
      return Updated([
        { ...state, polling: true },
        Cmd.create<Action>(done =>
          getAgentList({ username }).then(LoadRobots).then(done)
        )
      ])
    }

    case 'LoadRobots': {
      return Updated([
        {
          ...state,
          polling: false,
          robots:
            state.polling && action.payload.isLeft()
              ? state.robots
              : RemoteData.fromEither(action.payload)
        },
        Cmd.none
      ])
    }

    case 'SelectRobot': {
      const robotId = action.payload

      return Updated([
        {
          ...state,
          joinStatus: Joining(robotId)
        },
        Cmd.create<Action>(done => {
          joinRoom({ username, robotId })
            .then(result => result.mapLeft(message => ({ robotId, message })))
            .then(SelectRobotDone)
            .then(done)
        })
      ])
    }

    case 'SelectRobotDone': {
      return action.payload.fold<Stage>(error => {
        return Updated([
          {
            ...state,
            joinStatus: JoinFail(error)
          },
          Cmd.none
        ])
      }, Joined)
    }
  }
}

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (
    state.polling ||
    state.joinStatus.type === 'Joining' ||
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
  const disabled = joinStatus.type === 'Joining'
  const loading =
    joinStatus.type === 'Joining' && joinStatus.payload === agent.id
  const error =
    joinStatus.type === 'JoinFail' && joinStatus.payload.robotId === agent.id
      ? joinStatus.payload.message
      : null

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
