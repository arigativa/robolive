import React from 'react'
import styled from '@emotion/styled'
import {
  Stack,
  StackItem,
  FormControl,
  FormLabel,
  FormHelperText,
  Button,
  Textarea,
  Input,
  HStack
} from '@chakra-ui/react'
import RemoteData from 'frctl/RemoteData'
import RemoteDataOptional from 'frctl/RemoteData/Optional'
import Either from 'frctl/Either'

import { Dispatch, Cmd } from 'core'
import { InfoTemplate, getInfoTemplates } from 'api'
import { SipConnection } from 'sip'
import { Case } from 'utils'

import type { RoomCredentials } from 'Room'

// S T A T E

export interface State {
  info: string
  templateName: null | string
  savingTemplate: RemoteDataOptional<string, never>
  infoTemplates: RemoteData<string, Array<InfoTemplate>>
}

export const initialState: State = {
  info: '',
  templateName: null,
  savingTemplate: RemoteDataOptional.NotAsked,
  infoTemplates: RemoteData.Loading
}

export const initCmd = (credentials: RoomCredentials): Cmd<Action> => {
  return Cmd.create<Action>(done => {
    getInfoTemplates(credentials).then(LoadInfoTemplates).then(done)
  })
}

// U P D A T E

export type Action =
  | Case<'ChangeInfo', string>
  | Case<'SendInfo', string>
  | Case<'ShowTemplateForm', boolean>
  | Case<'ChangeTemplateName', string>
  | Case<'SaveTemplate', string>
  | Case<'SaveTemplateDone', Either<string, null>>
  | Case<'LoadInfoTemplates', Either<string, Array<InfoTemplate>>>

const ChangeInfo = Case.of<'ChangeInfo', Action>('ChangeInfo')
const SendInfo = Case.of<'SendInfo', Action>('SendInfo')
const ShowTemplateForm = Case.of<'ShowTemplateForm', Action>('ShowTemplateForm')
const ChangeTemplateName = Case.of<'ChangeTemplateName', Action>(
  'ChangeTemplateName'
)
const SaveTemplate = Case.of<'SaveTemplate', Action>('SaveTemplate')
// const SaveTemplateDone = Case.of<'SaveTemplateDone', Action>('SaveTemplateDone')
const LoadInfoTemplates = Case.of<'LoadInfoTemplates', Action>(
  'LoadInfoTemplates'
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
      return [state, connection.sendInfo(action.payload)]
    }

    case 'ShowTemplateForm': {
      return [
        {
          ...state,
          templateName: action.payload ? '' : null,
          savingTemplate: RemoteDataOptional.NotAsked
        },
        Cmd.none
      ]
    }

    case 'ChangeTemplateName': {
      return [
        {
          ...state,
          templateName: action.payload
        },
        Cmd.none
      ]
    }

    case 'SaveTemplate': {
      return [
        {
          ...state,
          savingTemplate: RemoteDataOptional.Loading
        },
        Cmd.none
      ]
    }

    case 'SaveTemplateDone': {
      return action.payload.cata({
        Left: error => [
          {
            ...state,
            savingTemplate: RemoteDataOptional.Failure(error)
          },
          Cmd.none
        ],
        Right: () => [state, Cmd.none]
      })
    }

    case 'LoadInfoTemplates': {
      return [
        {
          ...state,
          infoTemplates: RemoteData.fromEither(action.payload)
        },
        Cmd.none
      ]
    }
  }
}

// V I E W

const ViewTemplateForm = React.memo<{
  template: string
  templateName: string
  busy: boolean
  error: null | string
  dispatch: Dispatch<Action>
}>(({ template, templateName, busy, error, dispatch }) => (
  <HStack
    as="form"
    align="start"
    onSubmit={event => {
      dispatch(SaveTemplate(template))

      event.preventDefault()
    }}
  >
    <FormControl>
      <Input
        autoFocus
        isReadOnly={busy}
        value={templateName}
        placeholder="Button name"
        onChange={event => dispatch(ChangeTemplateName(event.target.value))}
      />

      {error && <FormHelperText color="coral">{error}</FormHelperText>}
    </FormControl>

    <Button
      colorScheme="teal"
      isDisabled={templateName.trim().length === 0}
      isLoading={busy}
    >
      Save
    </Button>

    <Button
      colorScheme="pink"
      variant="outline"
      isDisabled={busy}
      onClick={() => dispatch(ShowTemplateForm(false))}
    >
      Cancel
    </Button>
  </HStack>
))

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

const StyledTextarea = styled(Textarea)`
  font-family: monospace;
`

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => {
  const [submitting, fakeSubmitting] = useFakeSubmitting(400)

  return (
    <Stack spacing="4">
      <StackItem>
        <FormControl>
          <FormLabel>Send Info</FormLabel>

          <StyledTextarea
            rows={10}
            resize="vertical"
            value={state.info}
            placeholder="Put info right here"
            onChange={event => dispatch(ChangeInfo(event.target.value))}
          />

          <FormHelperText>
            You can submit both plain text and JSON or save it as a Button
          </FormHelperText>
        </FormControl>
      </StackItem>

      <StackItem>
        {state.templateName == null ? (
          <HStack>
            <Button
              colorScheme="teal"
              isLoading={submitting}
              onClick={() => {
                fakeSubmitting()
                dispatch(SendInfo(state.info))
              }}
            >
              Submit
            </Button>

            <Button
              variant="outline"
              colorScheme="teal"
              onClick={() => dispatch(ShowTemplateForm(true))}
            >
              Save as Template
            </Button>
          </HStack>
        ) : (
          <ViewTemplateForm
            template={state.info}
            templateName={state.templateName}
            busy={state.savingTemplate.isLoading()}
            error={state.savingTemplate.cata({
              Failure: error => error,
              _: () => null
            })}
            dispatch={dispatch}
          />
        )}
      </StackItem>
    </Stack>
  )
})
