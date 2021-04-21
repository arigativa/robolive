import React, { ReactNode } from 'react'
import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Button,
  Textarea,
  HStack,
  VStack
} from '@chakra-ui/react'

import type { RoomCredentials } from 'Room'

import { Dispatch, Cmd, useMapDispatch } from 'core'
import { SipConnection } from 'sip'
import { Case } from 'utils'
import { SkeletonRect, SkeletonText } from 'Skeleton'
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

export const initCmd = (credentials: RoomCredentials): Cmd<Action> => {
  return InfoTemplates.initCmd(credentials).map(InfoTemplatesAction)
}

// U P D A T E

export type Action =
  | Case<'ChangeInfo', string>
  | Case<'SendInfo'>
  | Case<'InfoTemplatesAction', InfoTemplates.Action>

const ChangeInfo = Case.of<'ChangeInfo', Action>('ChangeInfo')
const SendInfo = Case.of<'SendInfo', Action>('SendInfo')()
const InfoTemplatesAction = Case.of<'InfoTemplatesAction', Action>(
  'InfoTemplatesAction'
)

export const update = (
  action: Action,
  credentials: RoomCredentials,
  connection: SipConnection,
  state: State
): [State, Cmd<Action>] => {
  switch (action.type) {
    case 'ChangeInfo': {
      return [
        {
          ...state,
          info: action.payload
        },
        Cmd.none
      ]
    }

    case 'SendInfo': {
      return [state, connection.sendInfo(state.info)]
    }

    case 'InfoTemplatesAction': {
      const [nextInfoTemplates, cmd] = InfoTemplates.update(
        action.payload,
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

const useFakeSubmitting = (ms: number): [boolean, VoidFunction] => {
  const [submitting, setSubmitting] = React.useState(false)
  const fakeSubmitting = React.useCallback(() => setSubmitting(true), [])

  React.useEffect(() => {
    if (submitting) {
      const timeoutId = setTimeout(() => {
        setSubmitting(false)
      }, ms)

      return () => clearTimeout(timeoutId)
    }
  }, [ms, submitting])

  return [submitting, fakeSubmitting]
}

const ContainerInfoForm: React.FC<{
  label: ReactNode
  textarea: ReactNode
  helperText: ReactNode
  submitButton: ReactNode
}> = ({ label, textarea, helperText, submitButton }) => (
  <FormControl>
    <FormLabel>{label}</FormLabel>

    {textarea}

    <FormHelperText>
      <HStack>
        <Box flex="1">{helperText}</Box>

        {submitButton}
      </HStack>
    </FormHelperText>
  </FormControl>
)

const ViewInfoForm = React.memo<{
  info: string
  dispatch: Dispatch<Action>
}>(({ info, dispatch }) => {
  const [submitting, fakeSubmitting] = useFakeSubmitting(400)

  return (
    <ContainerInfoForm
      label="Send Info"
      textarea={
        <Textarea
          fontFamily="monospace"
          display="block"
          rows={10}
          resize="vertical"
          value={info}
          placeholder="Put info right here"
          onChange={event => dispatch(ChangeInfo(event.target.value))}
        />
      }
      helperText="You can submit both plain text and JSON"
      submitButton={
        <Button
          size="sm"
          colorScheme="teal"
          isLoading={submitting}
          onClick={() => {
            fakeSubmitting()
            dispatch(SendInfo)
          }}
        >
          Submit
        </Button>
      }
    />
  )
})

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => (
  <VStack spacing="4" align="start">
    <ViewInfoForm info={state.info} dispatch={dispatch} />

    <InfoTemplates.View
      template={state.info}
      state={state.infoTemplates}
      dispatch={useMapDispatch(InfoTemplatesAction, dispatch)}
    />
  </VStack>
))

// S K E L E T O N

export const Skeleton = React.memo(() => (
  <VStack spacing="4" align="start">
    <ContainerInfoForm
      label={<SkeletonText />}
      textarea={<SkeletonRect width="100%" height={188} />}
      helperText={<SkeletonText />}
      submitButton={<SkeletonRect width={72} height={32} />}
    />

    <InfoTemplates.Skeleton />
  </VStack>
))
