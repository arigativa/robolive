import React from 'react'
import {
  Wrap,
  WrapItem,
  Tooltip,
  ButtonGroup,
  Button,
  IconButton,
  InputGroup,
  InputRightElement,
  Input,
  InputLeftElement
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon, WarningIcon } from '@chakra-ui/icons'
import RemoteData from 'frctl/RemoteData'
import Either from 'frctl/Either'

import { Dispatch, Cmd } from 'core'
import { InfoTemplate, getInfoTemplates, saveInfoTemplates } from 'api'
import { SipConnection } from 'sip'
import { SkeletonRect } from 'Skeleton'
import { AlertPanel } from 'AlertPanel'
import { Case } from 'utils'

import type { RoomCredentials } from 'Room'

// S T A T E

export interface State {
  name: string
  saving: RemoteData.Optional<string, never>
  infoTemplates: RemoteData<string, Array<InfoTemplate>>
}

export const initialState: State = {
  name: '',
  saving: RemoteData.Optional.NotAsked,
  infoTemplates: RemoteData.Loading
}

export const initCmd = (credentials: RoomCredentials): Cmd<Action> => {
  return Cmd.create<Action>(done => {
    getInfoTemplates(credentials).then(LoadInfoTemplates).then(done)
  })
}

// U P D A T E

export type Action =
  | Case<'LoadInfoTemplates', Either<string, Array<InfoTemplate>>>
  | Case<'SendTemplate', string>
  | Case<'ChangeName', string>
  | Case<'SaveTemplate', string>
  | Case<'DeleteTemplate', string>
  | Case<'UpdateTemplatesDone', Either<string, null>>

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
  credentials: RoomCredentials,
  connection: SipConnection,
  state: State
): [State, Cmd<Action>] => {
  switch (action.type) {
    case 'LoadInfoTemplates': {
      return [
        {
          ...state,
          infoTemplates: RemoteData.fromEither(action.payload)
        },
        Cmd.none
      ]
    }

    case 'SendTemplate': {
      return [state, connection.sendInfo(action.payload)]
    }

    case 'ChangeName': {
      return [
        {
          ...state,
          name: action.payload
        },
        Cmd.none
      ]
    }

    case 'SaveTemplate': {
      const infoTemplates = state.infoTemplates.getOrElse([])
      const templateValidation = validateTemplate(state.name, infoTemplates)

      if (templateValidation !== null) {
        return [
          { ...state, saving: RemoteData.Optional.Failure(templateValidation) },
          Cmd.none
        ]
      }

      const nextTemplates = [
        ...infoTemplates,
        {
          name: state.name.trim(),
          content: action.payload
        }
      ]

      return [
        {
          ...state,
          saving: RemoteData.Optional.Loading
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
          saving: RemoteData.Optional.Loading
        },
        Cmd.create<Action>(done => {
          saveInfoTemplates(credentials, nextTemplates)
            .then(UpdateTemplatesDone)
            .then(done)
        })
      ]
    }

    case 'UpdateTemplatesDone': {
      return action.payload.cata<[State, Cmd<Action>]>({
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
            saving: RemoteData.Optional.NotAsked
          },
          initCmd(credentials)
        ]
      })
    }
  }
}

// V I E W

const ViewTemplate = React.memo<{
  infoTemplate: InfoTemplate
  dispatch: Dispatch<Action>
}>(({ infoTemplate, dispatch }) => (
  <ButtonGroup isAttached size="sm">
    <Button
      variant="outline"
      colorScheme="teal"
      onClick={() => dispatch(SendTemplate(infoTemplate.content))}
    >
      {infoTemplate.name}
    </Button>

    <IconButton
      aria-label="Delete template"
      ml="-px"
      colorScheme="pink"
      onClick={() => dispatch(DeleteTemplate(infoTemplate.content))}
    >
      <DeleteIcon />
    </IconButton>
  </ButtonGroup>
))

const ViewTemplateForm = React.memo<{
  template: string
  name: string
  readonly: boolean
  busy: boolean
  error: null | string
  dispatch: Dispatch<Action>
}>(({ template, name, readonly, busy, error, dispatch }) => (
  <InputGroup
    as="form"
    size="sm"
    width={200}
    onSubmit={event => {
      dispatch(SaveTemplate(template))

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
      isReadOnly={busy || readonly}
      value={name}
      placeholder="Template name"
      onChange={event => dispatch(ChangeName(event.target.value))}
    />

    <InputRightElement>
      <IconButton
        aria-label="Save template"
        size="xs"
        colorScheme="teal"
        isDisabled={readonly}
        isLoading={busy}
      >
        <AddIcon />
      </IconButton>
    </InputRightElement>
  </InputGroup>
))

const ViewTemplates = React.memo<{
  infoTemplates: RemoteData<string, Array<InfoTemplate>>
  dispatch: Dispatch<Action>
}>(({ infoTemplates, dispatch }) => {
  return infoTemplates.cata({
    Loading: () => <SkeletonTemplates />,

    Failure: message => (
      <WrapItem>
        <AlertPanel status="error" title="Request Error!">
          {message}
        </AlertPanel>
      </WrapItem>
    ),

    Succeed: templates => (
      <>
        {templates.map(template => (
          <WrapItem key={template.name}>
            <ViewTemplate infoTemplate={template} dispatch={dispatch} />
          </WrapItem>
        ))}
      </>
    )
  })
})

export const View = React.memo<{
  template: string
  state: State
  dispatch: Dispatch<Action>
}>(({ template, state, dispatch }) => {
  return (
    <Wrap spacing="2">
      <WrapItem>
        <ViewTemplateForm
          template={template}
          name={state.name}
          readonly={!state.infoTemplates.isSucceed()}
          busy={state.saving.isLoading()}
          error={state.saving.cata({
            Failure: error => error,
            _: () => null
          })}
          dispatch={dispatch}
        />
      </WrapItem>

      <ViewTemplates infoTemplates={state.infoTemplates} dispatch={dispatch} />
    </Wrap>
  )
})

// S K E L E T O N

const SkeletonTemplates = React.memo(() => (
  <>
    {[80, 120, 80].map((width, i) => (
      <WrapItem key={i}>
        <SkeletonRect width={width} height={32} />
      </WrapItem>
    ))}
  </>
))

export const Skeleton = React.memo(() => (
  <Wrap spacing="2">
    <WrapItem>
      <SkeletonRect width={200} height={32} />
    </WrapItem>

    <SkeletonTemplates />
  </Wrap>
))
