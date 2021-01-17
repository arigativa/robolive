import React from 'react'

import { Dispatch, Cmd, Sub } from 'core'
import { ActionOf, every } from 'utils'

export interface State {
  uuid: null | string
  count: number
  auto: boolean
  delayed: boolean
}

export const init: [State, Cmd<Action>] = [
  {
    uuid: null,
    count: 0,
    auto: true,
    delayed: false
  },
  Cmd.create<Action>(done => {
    done(SetUUID(Date.now().toString() + Math.random().toFixed(6)))
  })
]

export type Action = ActionOf<[State], [State, Cmd<Action>]>

const SetUUID = ActionOf<string, Action>((uuid, state) => [
  {
    ...state,
    uuid
  },
  Cmd.none
])

const Increment = ActionOf<Action>(state => [
  {
    ...state,
    count: state.count + 1
  },
  Cmd.none
])()

const Decrement = ActionOf<Action>(state => [
  {
    ...state,
    count: state.count - 1
  },
  Cmd.none
])()

const AutoIncrement = ActionOf<boolean, Action>((auto, state) => [
  {
    ...state,
    auto
  },
  Cmd.none
])

const Delayed = ActionOf<Action, Action>((action, state) => {
  const { uuid } = state

  return uuid === null
    ? [state, Cmd.none]
    : [
        {
          ...state,
          delayed: true
        },
        Cmd.create<Action>((done, onCancel) => {
          const timeoutId = setTimeout(() => {
            done(DelayedDone(action))
          }, 3000)

          onCancel(uuid, () => {
            clearTimeout(timeoutId)
          })
        })
      ]
})

const DelayedDone = ActionOf<Action, Action>((action, state) => {
  return action.update({
    ...state,
    delayed: false
  })
})

const StopDelayed = ActionOf<Action>(state => {
  return state.uuid === null
    ? [state, Cmd.none]
    : [
        {
          ...state,
          delayed: false
        },
        Cmd.cancel(state.uuid)
      ]
})()

export const subscriptions = (ms: number, state: State): Sub<Action> => {
  if (state.auto) {
    return every(ms, () => Increment)
  }

  return Sub.none
}

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = React.memo(({ state, dispatch }) => (
  <div>
    <button type="button" onClick={() => dispatch(Decrement)}>
      -
    </button>
    {state.count}
    <button type="button" onClick={() => dispatch(Increment)}>
      +
    </button>
    {/* Auto Increment */}
    <br />
    <input
      type="checkbox"
      checked={state.auto}
      onChange={event => dispatch(AutoIncrement(event.target.checked))}
    />
    auto increment
    {/* Delayed */}
    <br />
    <button type="button" onClick={() => dispatch(Delayed(Decrement))}>
      Delayed -
    </button>
    <br />
    <button type="button" onClick={() => dispatch(Delayed(Increment))}>
      Delayed +
    </button>
    <br />
    {state.delayed && (
      <button type="button" onClick={() => dispatch(StopDelayed)}>
        Stop Delayed
      </button>
    )}
  </div>
))
