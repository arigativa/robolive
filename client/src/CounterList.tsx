import React from 'react'

import { Dispatch, Cmd, Sub } from 'core'
import { ActionOf } from 'utils'
import * as Counter from './Counter'

export interface State {
  ids: number
  list: Array<number>
  interval: number
  counters: Record<number, undefined | Counter.State>
}

export const init: [State, Cmd<Action>] = [
  {
    ids: 1,
    list: [0],
    interval: 100,
    counters: {
      0: Counter.init[0]
    }
  },
  Counter.init[1].map(action => CounterAction({ counterId: 0, action }))
]

export type Action = ActionOf<[State], [State, Cmd<Action>]>

const SetInterval = ActionOf<number, Action>((interval, state) => [
  {
    ...state,
    interval
  },
  Cmd.none
])

const AddCounter = ActionOf<Action>(state => {
  const [initialCounter, cmd] = Counter.init

  return [
    {
      ...state,
      ids: state.ids + 1,
      list: [...state.list, state.ids],
      counters: {
        ...state.counters,
        [state.ids]: initialCounter
      }
    },
    cmd.map(action => CounterAction({ counterId: state.ids, action }))
  ]
})()

const RemoveCounter = ActionOf<number, Action>((counterId, state) => {
  const { [counterId]: _, ...nextCounters } = state.counters

  return [
    {
      ...state,
      list: state.list.filter(id => id !== counterId),
      counters: nextCounters
    },
    Cmd.none
  ]
})

const CounterAction = ActionOf<
  { counterId: number; action: Counter.Action },
  Action
>(({ counterId, action }, state) => {
  const counter = state.counters[counterId]

  if (counter == null) {
    return [state, Cmd.none]
  }

  const [nextCounter, cmd] = action.update(counter)

  return [
    {
      ...state,
      counters: {
        ...state.counters,
        [counterId]: nextCounter
      }
    },
    cmd.map((act): Action => CounterAction({ counterId, action: act }))
  ]
})

export const subscriptions = (state: State): Sub<Action> => {
  return Sub.batch(
    state.list.map(counterId => {
      const counter = state.counters[counterId]

      if (counter == null) {
        return Sub.none
      }

      return Counter.subscriptions(state.interval, counter).map(action =>
        CounterAction({ counterId, action })
      )
    })
  )
}

const ViewCounter: React.FC<{
  counterId: number
  counter: Counter.State
  dispatch: Dispatch<Action>
}> = React.memo(({ counterId, counter, dispatch }) => {
  const counterDispatch = React.useCallback(
    (action: Counter.Action) => dispatch(CounterAction({ counterId, action })),
    [counterId, dispatch]
  )

  return (
    <div
      style={{
        margin: '10px 0 0 10px',
        padding: '10px',
        border: '1px solid #444'
      }}
    >
      <button type="button" onClick={() => dispatch(RemoveCounter(counterId))}>
        Remove counter
      </button>

      <Counter.View state={counter} dispatch={counterDispatch} />
    </div>
  )
})

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = React.memo(({ state, dispatch }) => (
  <div
    style={{
      padding: '20px'
    }}
  >
    <h1>Counter List is here</h1>

    <button type="button" onClick={() => dispatch(AddCounter)}>
      Add new counter
    </button>

    <div>
      <input
        type="range"
        min="16"
        max="200"
        value={state.interval}
        onChange={event => dispatch(SetInterval(Number(event.target.value)))}
      />
    </div>

    <div
      style={{
        display: 'flex',
        flexFlow: 'row',
        flexWrap: 'wrap'
      }}
    >
      {state.list.map(counterId => {
        const counter = state.counters[counterId]

        return (
          counter && (
            <ViewCounter
              key={counterId}
              counterId={counterId}
              counter={counter}
              dispatch={dispatch}
            />
          )
        )
      })}
    </div>
  </div>
))
