import React from 'react'
import styled from '@emotion/styled'
import {
  Box,
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
import Either from 'frctl/Either'

import { Dispatch, Cmd } from 'core'
import { InfoTemplate, getInfoTemplates, saveInfoTemplates } from 'api'
import { SipConnection } from 'sip'
import { Case } from 'utils'

import type { RoomCredentials } from 'Room'

// S T A T E

export interface State {
  info: string
  templateName: null | string
  savingTemplate: RemoteData.Optional<string, never>
  infoTemplates: RemoteData<string, Array<InfoTemplate>>
}

export const initialState: State = {
  info: '',
  templateName: null,
  savingTemplate: RemoteData.Optional.NotAsked,
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
  | Case<'SendInfo'>
  | Case<'ShowTemplateForm', boolean>
  | Case<'ChangeTemplateName', string>
  | Case<'SaveTemplate', InfoTemplate>
  | Case<'DeleteTemplate', string>
  | Case<'UpdateTemplatesDone', Either<string, null>>
  | Case<'LoadInfoTemplates', Either<string, Array<InfoTemplate>>>

const ChangeInfo = Case.of<'ChangeInfo', Action>('ChangeInfo')
const SendInfo = Case.of<'SendInfo', Action>('SendInfo')()
const ShowTemplateForm = Case.of<'ShowTemplateForm', Action>('ShowTemplateForm')
const ChangeTemplateName = Case.of<'ChangeTemplateName', Action>(
  'ChangeTemplateName'
)
const SaveTemplate = Case.of<'SaveTemplate', Action>('SaveTemplate')
// const DeleteTemplate = Case.of<'DeleteTemplate', Action>('DeleteTemplate')
const UpdateTemplatesDone = Case.of<'UpdateTemplatesDone', Action>(
  'UpdateTemplatesDone'
)
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
      return [state, connection.sendInfo(state.info)]
    }

    case 'ShowTemplateForm': {
      return [
        {
          ...state,
          templateName: action.payload ? '' : null,
          savingTemplate: RemoteData.Optional.NotAsked
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
      const nextTemplates = [
        ...state.infoTemplates.getOrElse([]),
        action.payload
      ]

      return [
        {
          ...state,
          savingTemplate: RemoteData.Optional.Loading
        },
        Cmd.create<Action>(done => {
          saveInfoTemplates(credentials, nextTemplates)
            .then(UpdateTemplatesDone)
            .then(done)
        })
      ]
    }

    case 'DeleteTemplate': {
      const nextTemplates = state.infoTemplates
        .getOrElse([])
        .filter(template => template.name !== action.payload)

      return [
        {
          ...state,
          savingTemplate: RemoteData.Optional.Loading
        },
        Cmd.create<Action>(done => {
          saveInfoTemplates(credentials, nextTemplates)
            .then(UpdateTemplatesDone)
            .then(done)
        })
      ]
    }

    case 'UpdateTemplatesDone': {
      return action.payload.cata({
        Left: error => [
          {
            ...state,
            savingTemplate: RemoteData.Optional.Failure(error)
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
      dispatch(
        SaveTemplate({
          name: templateName.trim(),
          content: template
        })
      )

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
            <HStack>
              <Box flex="1">You can submit both plain text and JSON</Box>

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
            </HStack>
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
                dispatch(SendInfo)
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
