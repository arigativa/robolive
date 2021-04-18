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
import Either from 'frctl/Either'

import { Dispatch, Cmd } from 'core'
import { SipConnection } from 'sip'
import { Case } from 'utils'

// S T A T E

export interface State {
  info: string
  templateName: null | string
  savingTemplate: boolean
}

export const initial: State = {
  info: '',
  templateName: null,
  savingTemplate: false
}

// U P D A T E

export type Action =
  | Case<'ChangeInfo', string>
  | Case<'SendInfo', string>
  | Case<'ShowTemplateForm', boolean>
  | Case<'ChangeTemplateName', string>
  | Case<'SaveTemplate', string>
  | Case<'SaveTemplateDone', Either<string, null>>

const ChangeInfo = Case.of<'ChangeInfo', Action>('ChangeInfo')
const SendInfo = Case.of<'SendInfo', Action>('SendInfo')
const ShowTemplateForm = Case.of<'ShowTemplateForm', Action>('ShowTemplateForm')
const ChangeTemplateName = Case.of<'ChangeTemplateName', Action>(
  'ChangeTemplateName'
)
const SaveTemplate = Case.of<'SaveTemplate', Action>('SaveTemplate')
// const SaveTemplateDone = Case.of<'SaveTemplateDone', Action>('SaveTemplateDone')

export const update = (
  action: Action,
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
          savingTemplate: false
        },
        Cmd.none
      ]
    }

    case 'ChangeTemplateName': {
      return [{ ...state, templateName: action.payload }, Cmd.none]
    }

    case 'SaveTemplate': {
      return [{ ...state, savingTemplate: true }, Cmd.none]
    }

    case 'SaveTemplateDone': {
      return [state, Cmd.none]
    }
  }
}

// V I E W

const ViewTemplateForm = React.memo<{
  template: string
  templateName: string
  savingTemplate: boolean
  dispatch: Dispatch<Action>
}>(({ template, templateName, savingTemplate, dispatch }) => (
  <HStack
    as="form"
    onSubmit={event => {
      dispatch(SaveTemplate(template))

      event.preventDefault()
    }}
  >
    <Input
      autoFocus
      isReadOnly={savingTemplate}
      value={templateName}
      placeholder="Button name"
      onChange={event => dispatch(ChangeTemplateName(event.target.value))}
    />

    <Button
      colorScheme="teal"
      isDisabled={templateName.trim().length === 0}
      isLoading={savingTemplate}
    >
      Save
    </Button>

    <Button
      colorScheme="pink"
      variant="outline"
      isDisabled={savingTemplate}
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
    <Stack
      as="form"
      onSubmit={event => {
        fakeSubmitting()
        dispatch(SendInfo(state.info))

        event.preventDefault()
      }}
    >
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
            <Button type="submit" colorScheme="teal" isLoading={submitting}>
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
            savingTemplate={state.savingTemplate}
            dispatch={dispatch}
          />
        )}
      </StackItem>
    </Stack>
  )
})
