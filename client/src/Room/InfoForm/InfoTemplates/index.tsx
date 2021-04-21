import React from 'react'
import {
  Box,
  Tooltip,
  Button,
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
  | Case<'SaveTemplate', InfoTemplate>
  | Case<'DeleteTemplate', string>
  | Case<'UpdateTemplatesDone', Either<string, null>>

const LoadInfoTemplates = Case.of<'LoadInfoTemplates', Action>(
  'LoadInfoTemplates'
)
const SendTemplate = Case.of<'SendTemplate', Action>('SendTemplate')
const ChangeName = Case.of<'ChangeName', Action>('ChangeName')
const SaveTemplate = Case.of<'SaveTemplate', Action>('SaveTemplate')
// const DeleteTemplate = Case.of<'DeleteTemplate', Action>('DeleteTemplate')
const UpdateTemplatesDone = Case.of<'UpdateTemplatesDone', Action>(
  'UpdateTemplatesDone'
)

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
      const nextTemplates = [
        ...state.infoTemplates.getOrElse([]),
        action.payload
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
  }
}

// V I E W

const ViewTemplate = React.memo<{
  infoTemplate: InfoTemplate
  dispatch: Dispatch<Action>
}>(({ infoTemplate, dispatch }) => (
  <Button
    size="sm"
    colorScheme="teal"
    variant="outline"
    onClick={() => dispatch(SendTemplate(infoTemplate.content))}
  >
    {infoTemplate.name}
  </Button>
))

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
    onSubmit={event => {
      dispatch(SaveTemplate({ name, content: template }))

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
      onChange={event => dispatch(ChangeName(event.target.value))}
    />

    <InputRightElement>
      <IconButton
        aria-label="Save template"
        size="xs"
        colorScheme="teal"
        isLoading={busy}
      >
        <AddIcon />
      </IconButton>
    </InputRightElement>
  </InputGroup>
))

const ViewFailure = React.memo(() => null)

const ViewContainer: React.FC = ({ children }) => (
  <Box flexWrap="wrap" display="flex" ml="-2" mt="-2">
    {React.Children.map(children, child => (
      <Box mt="2" ml="2">
        {child}
      </Box>
    ))}
  </Box>
)

export const View = React.memo<{
  template: string
  state: State
  dispatch: Dispatch<Action>
}>(({ template, state, dispatch }) => {
  return state.infoTemplates.cata({
    Loading: () => <Skeleton />,

    Failure: () => <ViewFailure />,

    Succeed: infoTemplates => (
      <ViewContainer>
        <ViewTemplateForm
          template={template}
          name={state.name}
          busy={state.saving.isLoading()}
          error={state.saving.cata({
            Failure: error => error,
            _: () => null
          })}
          dispatch={dispatch}
        />

        {infoTemplates.map(infoTemplate => (
          <ViewTemplate
            key={infoTemplate.name}
            infoTemplate={infoTemplate}
            dispatch={dispatch}
          />
        ))}
      </ViewContainer>
    )
  })
})

// S K E L E T O N

export const Skeleton = React.memo(() => null)
