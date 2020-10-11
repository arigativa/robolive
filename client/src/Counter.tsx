import React from 'react'
import { Button } from '@chakra-ui/core'

import { Dispatch, Effects } from 'core'

// S T A T E

export type State = {
  count: number
}

export const init: [State, Effects<Action>] = [
  { count: 0 },
  [dispatch => dispatch(Delay(1000, Increment))]
]

// A C T I O N S

export type Action =
  | { type: 'Decrement' }
  | { type: 'Increment' }
  | { type: 'Delay'; ms: number; action: Action }

const Decrement: Action = { type: 'Decrement' }
const Increment: Action = { type: 'Increment' }
const Delay = (ms: number, action: Action): Action => ({
  type: 'Delay',
  ms,
  action
})

export const update = (
  action: Action,
  state: State
): [State, Effects<Action>] => {
  switch (action.type) {
    case 'Decrement': {
      return [
        {
          ...state,
          count: state.count - 1
        },
        []
      ]
    }

    case 'Increment': {
      return [
        {
          ...state,
          count: state.count + 1
        },
        []
      ]
    }

    case 'Delay': {
      return [
        state,
        [
          dispatch => {
            setTimeout(() => {
              dispatch(action.action)
            }, action.ms)
          }
        ]
      ]
    }
  }
}

// V I E W

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = ({ state, dispatch }) => (
  <div>
    <Button
      variantColor="green"
      onClick={() => dispatch(Delay(2000, Decrement))}
    >
      -
    </Button>
    {state.count}
    <Button variantColor="red" onClick={() => dispatch(Increment)}>
      +
    </Button>
  </div>
)
