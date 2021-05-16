import React from 'react'
import { Button, Textarea, HStack, VStack } from '@chakra-ui/react'

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

const ViewContainer: React.VFC<{
  hideTextarea?: boolean
  hideTemplates?: boolean
  textarea: React.ReactNode
  infoTemplatesInput: React.ReactNode
  infoTemplatesButtons: React.ReactNode
  submitButton: React.ReactNode
}> = ({
  hideTextarea = false,
  hideTemplates = false,
  textarea,
  infoTemplatesInput,
  infoTemplatesButtons,
  submitButton
}) => (
  <VStack spacing="4" align="start" alignItems="stretch">
    {!hideTextarea && textarea}

    <HStack alignItems="flex-start" justifyContent="space-between" spacing="4">
      {!hideTemplates && infoTemplatesInput}
      {!hideTextarea && submitButton}
    </HStack>

    {!hideTemplates && infoTemplatesButtons}
  </VStack>
)

export const View: React.VFC<{
  hideTextarea?: boolean
  hideTemplates?: boolean
  state: State
  dispatch: Dispatch<Action>
}> = React.memo(({ hideTextarea, hideTemplates, state, dispatch }) => (
  <ViewContainer
    hideTextarea={hideTextarea}
    hideTemplates={hideTemplates}
    textarea={
      <Textarea
        fontFamily="monospace"
        fontSize="sm"
        display="block"
        rows={8}
        resize="vertical"
        value={state.info}
        placeholder="You can submit both plain text and JSON"
        onChange={event => dispatch(ChangeInfo({ info: event.target.value }))}
      />
    }
    infoTemplatesInput={
      <InfoTemplates.ViewInput
        content={state.info}
        state={state.infoTemplates}
        dispatch={useMapDispatch(InfoTemplatesAction, dispatch)}
      />
    }
    infoTemplatesButtons={
      <InfoTemplates.ViewButtons
        state={state.infoTemplates}
        dispatch={useMapDispatch(InfoTemplatesAction, dispatch)}
      />
    }
    submitButton={
      <Button
        flexShrink={0}
        size="sm"
        colorScheme="teal"
        onClick={() => dispatch(SendInfo)}
      >
        Submit
      </Button>
    }
  />
))

// S K E L E T O N

export const Skeleton: React.VFC<{
  hideTextarea?: boolean
  hideTemplates?: boolean
}> = React.memo(({ hideTextarea, hideTemplates }) => (
  <ViewContainer
    hideTextarea={hideTextarea}
    hideTemplates={hideTemplates}
    textarea={<SkeletonRect width="100%" height={194} />}
    infoTemplatesInput={<InfoTemplates.SkeletonInput />}
    infoTemplatesButtons={<InfoTemplates.SkeletonButtons />}
    submitButton={<SkeletonRect width={72} height={32} />}
  />
))
