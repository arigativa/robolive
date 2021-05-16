import React from 'react'
import { Box, Button, Textarea, HStack, VStack } from '@chakra-ui/react'

import type { Credentials } from 'Room'

import { Dispatch, Cmd, useMapDispatch } from 'core'
import { SipConnection } from 'sip'
import { Case } from 'utils'
import { SkeletonRect } from 'Skeleton'
import * as InfoTemplates from './InfoTemplates'

// S T A T E

export interface State {
  info: string
  infoTemplates: InfoTemplates.State
}

export const initialState: State = {
  info: '',
  infoTemplates: InfoTemplates.initialState
}

export const initCmd = (credentials: Credentials): Cmd<Action> => {
  return InfoTemplates.initCmd(credentials).map(InfoTemplatesAction)
}

// U P D A T E

export type Action =
  | Case<'ChangeInfo', { info: string }>
  | Case<'SendInfo'>
  | Case<'InfoTemplatesAction', { action: InfoTemplates.Action }>

const ChangeInfo = Case.of<'ChangeInfo', Action>('ChangeInfo')
const SendInfo = Case.of<'SendInfo', Action>('SendInfo')()
const InfoTemplatesAction = (action: InfoTemplates.Action): Action => ({
  type: 'InfoTemplatesAction',
  action
})

export const update = (
  action: Action,
  credentials: Credentials,
  connection: SipConnection,
  state: State
): [State, Cmd<Action>] => {
  switch (action.type) {
    case 'ChangeInfo': {
      return [
        {
          ...state,
          info: action.info
        },
        Cmd.none
      ]
    }

    case 'SendInfo': {
      return [state, connection.sendInfo(state.info)]
    }

    case 'InfoTemplatesAction': {
      const [nextInfoTemplates, cmd] = InfoTemplates.update(
        action.action,
        credentials,
        connection,
        state.infoTemplates
      )

      return [
        {
          ...state,
          infoTemplates: nextInfoTemplates
        },
        cmd.map(InfoTemplatesAction)
      ]
    }
  }
}

// V I E W

const ViewContainer: React.FC<{
  textarea: React.ReactNode
  infoTemplates: React.ReactNode
  submitButton: React.ReactNode
}> = ({ textarea, infoTemplates, submitButton }) => (
  <VStack spacing="4" align="start" alignItems="stretch">
    {textarea}

    <HStack alignItems="flex-start" justifyContent="space-between" spacing="4">
      {infoTemplates}
      <Box flexShrink={0}>{submitButton}</Box>
    </HStack>
  </VStack>
)

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => (
  <ViewContainer
    textarea={
      <Textarea
        fontFamily="monospace"
        display="block"
        rows={12}
        resize="vertical"
        value={state.info}
        placeholder="You can submit both plain text and JSON"
        onChange={event => dispatch(ChangeInfo({ info: event.target.value }))}
      />
    }
    infoTemplates={
      <InfoTemplates.View
        template={state.info}
        state={state.infoTemplates}
        dispatch={useMapDispatch(InfoTemplatesAction, dispatch)}
      />
    }
    submitButton={
      <Button size="sm" colorScheme="teal" onClick={() => dispatch(SendInfo)}>
        Submit
      </Button>
    }
  />
))

// S K E L E T O N

export const Skeleton = React.memo(() => (
  <ViewContainer
    textarea={<SkeletonRect width="100%" height={282} />}
    infoTemplates={<InfoTemplates.Skeleton />}
    submitButton={<SkeletonRect width={72} height={32} />}
  />
))
