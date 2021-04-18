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

const ChangeName = Case.of<'ChangeName', Action>('ChangeName')
const Save = Case.of<'Save', Action>('Save')
// const SaveDone = Case.of<'SaveDone', Action>('SaveDone')()

export type Stage = Case<'Updated', [State, Cmd<Action>]> | Case<'Saved'>

const Updated = Case.of<'Updated', Stage>('Updated')
const Saved = Case.of<'Saved', Stage>('Saved')()

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
  }
}

// V I E W

export const View = React.memo<{
  autoFocus?: boolean
  template: string
  state: State
  dispatch: Dispatch<Action>
}>(({ autoFocus, template, state, dispatch }) => {
  const onNameChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(ChangeName(event.target.value))
    },
    [dispatch]
  )

  return (
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
        onChange={onNameChange}
      />

      <Button isLoading={state.saving}>Save</Button>
    </HStack>
  )
})
