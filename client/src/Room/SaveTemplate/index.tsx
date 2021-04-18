import React from 'react'
import { HStack, Button, Input } from '@chakra-ui/react'

import { Dispatch, Cmd } from 'core'
import { Case } from 'utils'

// S T A T E

export interface State {
  name: string
  saving: boolean
}

export const initial: State = {
  name: '',
  saving: false
}

// U P D A T E

export type Action =
  | Case<'ChangeName', string>
  | Case<'Save', string>
  | Case<'SaveDone'>
  | Case<'Cancel'>

const ChangeName = Case.of<'ChangeName', Action>('ChangeName')
const Save = Case.of<'Save', Action>('Save')
const Cancel = Case.of<'Cancel', Action>('Cancel')()
// const SaveDone = Case.of<'SaveDone', Action>('SaveDone')()

export type Stage =
  | Case<'Updated', [State, Cmd<Action>]>
  | Case<'Saved'>
  | Case<'Canceled'>

const Updated = Case.of<'Updated', Stage>('Updated')
const Saved = Case.of<'Saved', Stage>('Saved')()
const Canceled = Case.of<'Canceled', Stage>('Canceled')()

export const update = (action: Action, state: State): Stage => {
  switch (action.type) {
    case 'ChangeName': {
      return Updated([{ ...state, name: action.payload }, Cmd.none])
    }

    case 'Save': {
      return Updated([{ ...state, saving: true }, Cmd.none])
    }

    case 'SaveDone': {
      return Saved
    }

    case 'Cancel': {
      return Canceled
    }
  }
}

// V I E W

export const View = React.memo<{
  autoFocus?: boolean
  template: string
  state: State
  dispatch: Dispatch<Action>
}>(({ autoFocus, template, state, dispatch }) => (
  <HStack
    as="form"
    onSubmit={event => {
      dispatch(Save(template))

      event.preventDefault()
    }}
  >
    <Input
      autoFocus={autoFocus}
      isReadOnly={state.saving}
      value={state.name}
      placeholder="Button name"
      onChange={event => dispatch(ChangeName(event.target.value))}
    />

    <Button
      colorScheme="teal"
      isDisabled={state.name.trim().length === 0}
      isLoading={state.saving}
    >
      Save
    </Button>

    <Button
      colorScheme="pink"
      variant="outline"
      isDisabled={state.saving}
      onClick={() => dispatch(Cancel)}
    >
      Cancel
    </Button>
  </HStack>
))
