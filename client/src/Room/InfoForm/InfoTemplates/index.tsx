import React from 'react'
import {
  Wrap,
  WrapItem,
  Tooltip,
  IconButton,
  InputGroup,
  InputRightElement,
  Input,
  InputLeftElement
} from '@chakra-ui/react'
import { AddIcon, WarningIcon } from '@chakra-ui/icons'
import RemoteData from 'frctl/RemoteData'
import Either from 'frctl/Either'

import { Dispatch, Cmd } from 'core'
import { InfoTemplate, getInfoTemplates, saveInfoTemplates } from 'api'
import { SipConnection } from 'sip'
import { SkeletonRect } from 'Skeleton'
import { AlertPanel } from 'AlertPanel'
import { Case } from 'utils'

import type { Credentials } from 'Room'
import { TemplateButton, SkeletonTemplateButton } from './TemplateButton'

// S T A T E

export interface State {
  templateName: string
  savingTemplate: RemoteData.Optional<string, never>
  infoTemplates: RemoteData<string, Array<InfoTemplate>>
}

export const initialState: State = {
  templateName: '',
  savingTemplate: RemoteData.Optional.NotAsked,
  infoTemplates: RemoteData.Loading
}

export const initCmd = (credentials: Credentials): Cmd<Action> => {
  return Cmd.create<Action>(done => {
    getInfoTemplates(credentials)
      .then(result => LoadInfoTemplates({ result }))
      .then(done)
  })
}

// U P D A T E

export type Action =
  | Case<'LoadInfoTemplates', { result: Either<string, Array<InfoTemplate>> }>
  | Case<'SendTemplate', { content: string }>
  | Case<'ChangeName', { name: string }>
  | Case<'SaveTemplate', { content: string }>
  | Case<'DeleteTemplate', { name: string }>
  | Case<
      'UpdateTemplatesDone',
      { resetName: boolean; result: Either<string, null> }
    >

const LoadInfoTemplates = Case.of<'LoadInfoTemplates', Action>(
  'LoadInfoTemplates'
)
const SendTemplate = Case.of<'SendTemplate', Action>('SendTemplate')
const ChangeName = Case.of<'ChangeName', Action>('ChangeName')
const SaveTemplate = Case.of<'SaveTemplate', Action>('SaveTemplate')
const DeleteTemplate = Case.of<'DeleteTemplate', Action>('DeleteTemplate')
const UpdateTemplatesDone = Case.of<'UpdateTemplatesDone', Action>(
  'UpdateTemplatesDone'
)

const validateTemplate = (
  name: string,
  templates: Array<InfoTemplate>
): null | string => {
  if (name.length === 0) {
    return 'Template name should not be empty'
  }

  const trrimmedName = name.trim()

  if (trrimmedName.length === 0) {
    return 'Template name should not be blank'
  }

  if (templates.some(template => template.name === trrimmedName)) {
    return 'Template with this name already exists'
  }

  return null
}

export const update = (
  action: Action,
  credentials: Credentials,
  connection: SipConnection,
  state: State
): [State, Cmd<Action>] => {
  switch (action.type) {
    case 'LoadInfoTemplates': {
      return [
        {
          ...state,
          infoTemplates: RemoteData.fromEither(action.result)
        },
        Cmd.none
      ]
    }

    case 'SendTemplate': {
      return [state, connection.sendInfo(action.content)]
    }

    case 'ChangeName': {
      return [
        {
          ...state,
          templateName: action.name,
          savingTemplate: RemoteData.Optional.NotAsked
        },
        Cmd.none
      ]
    }

    case 'SaveTemplate': {
      const infoTemplates = state.infoTemplates.getOrElse([])
      const templateValidation = validateTemplate(
        state.templateName,
        infoTemplates
      )

      if (templateValidation !== null) {
        return [
          {
            ...state,
            savingTemplate: RemoteData.Optional.Failure(templateValidation)
          },
          Cmd.none
        ]
      }

      const nextTemplates = [
        ...infoTemplates,
        {
          name: state.templateName.trim(),
          content: action.content
        }
      ]

      return [
        {
          ...state,
          savingTemplate: RemoteData.Optional.Loading
        },
        Cmd.create<Action>(done => {
          saveInfoTemplates(credentials, nextTemplates)
            .then(result => UpdateTemplatesDone({ resetName: true, result }))
            .then(done)
        })
      ]
    }

    case 'DeleteTemplate': {
      const nextTemplates = state.infoTemplates
        .getOrElse([])
        .filter(template => template.name !== action.name)

      return [
        {
          ...state,
          savingTemplate: RemoteData.Optional.Loading
        },
        Cmd.create<Action>(done => {
          saveInfoTemplates(credentials, nextTemplates)
            .then(result => UpdateTemplatesDone({ resetName: false, result }))
            .then(done)
        })
      ]
    }

    case 'UpdateTemplatesDone': {
      return action.result.cata<[State, Cmd<Action>]>({
        Left: error => [
          {
            ...state,
            savingTemplate: RemoteData.Optional.Failure(error)
          },
          Cmd.none
        ],
        Right: () => [
          {
            ...state,
            templateName: action.resetName ? '' : state.templateName,
            savingTemplate: RemoteData.Optional.NotAsked
          },
          Cmd.create<Action>(done => {
            getInfoTemplates(credentials)
              .then(result => LoadInfoTemplates({ result }))
              .then(done)
          })
        ]
      })
    }
  }
}

// V I E W

const ViewTemplateForm = React.memo<{
  template: string
  name: string
  busy: boolean
  error: null | string
  dispatch: Dispatch<Action>
}>(({ template, name, busy, error, dispatch }) => (
  <InputGroup
    as="form"
    size="sm"
    width={200}
    onSubmit={event => {
      dispatch(SaveTemplate({ content: template }))

      event.preventDefault()
    }}
  >
    {error && (
      <InputLeftElement>
        <Tooltip aria-label="Save template error" label={error}>
          <WarningIcon color="coral" />
        </Tooltip>
      </InputLeftElement>
    )}

    <Input
      autoFocus
      isReadOnly={busy}
      value={name}
      placeholder="Template name"
      onChange={event => dispatch(ChangeName({ name: event.target.value }))}
    />

    <InputRightElement>
      <IconButton
        aria-label="Save template"
        type="submit"
        size="xs"
        colorScheme="teal"
        isLoading={busy}
      >
        <AddIcon />
      </IconButton>
    </InputRightElement>
  </InputGroup>
))

export const View = React.memo<{
  template: string
  state: State
  dispatch: Dispatch<Action>
}>(({ template, state, dispatch }) => {
  return state.infoTemplates.cata({
    Loading: () => <Skeleton />,

    Failure: message => (
      <AlertPanel status="error" title="Request Error!">
        {message}
      </AlertPanel>
    ),

    Succeed: infoTemplates => (
      <Wrap spacing="2">
        <WrapItem>
          <ViewTemplateForm
            template={template}
            name={state.templateName}
            busy={state.savingTemplate.isLoading()}
            error={state.savingTemplate.cata({
              Failure: error => error,
              _: () => null
            })}
            dispatch={dispatch}
          />
        </WrapItem>

        {infoTemplates.map(infoTemplate => (
          <WrapItem key={infoTemplate.name}>
            <TemplateButton
              onSubmit={() => {
                dispatch(SendTemplate({ content: infoTemplate.content }))
              }}
              onDelete={() => {
                dispatch(DeleteTemplate({ name: infoTemplate.name }))
              }}
            >
              {infoTemplate.name}
            </TemplateButton>
          </WrapItem>
        ))}
      </Wrap>
    )
  })
})

// S K E L E T O N

export const Skeleton = React.memo(() => (
  <Wrap spacing="2">
    <WrapItem>
      <SkeletonRect width={200} height={32} />
    </WrapItem>

    {[80, 120, 80].map((width, i) => (
      <WrapItem key={i}>
        <SkeletonTemplateButton width={width} />
      </WrapItem>
    ))}
  </Wrap>
))
