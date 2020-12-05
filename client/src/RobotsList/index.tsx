import React from 'react'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData'

import { Cmd, Sub, Dispatch, caseOf, match } from 'core'
import { every } from 'utils'
import { AgentListRequest } from '../generated/Info_pb'
import { InfoEndpointClient } from '../generated/Info_pb_service'
import { BrowserHeaders } from 'browser-headers'

const req = new InfoEndpointClient('https://localhost:3477')

// S T A T E

export type State = {
  ts: number
  tick: boolean
  robots: RemoteData<number, string>
}

export const init: [State, Cmd<Action>] = [
  {
    ts: 0,
    tick: true,
    robots: RemoteData.Loading
  },
  Cmd.create((done, onCancel) => {
    // req.agentList(new AgentListRequest(), new BrowserHeaders(), (err, data) => {
    //   if (err) {
    //     // eslint-disable-next-line no-console
    //     console.error(err)
    //   } else {
    //     // eslint-disable-next-line no-console
    //     console.log(data)
    //   }
    // })

    const timeoutId = setTimeout(() => {
      done(LoadRobots(Either.Right('empty')))
    }, 2000)

    onCancel('foo', () => {
      clearTimeout(timeoutId)
    })
  })
]

// U P D A T E

export type Action =
  | ReturnType<typeof LoadRobots>
  | typeof Abort
  | typeof Switch
  | ReturnType<typeof Tick>

const LoadRobots = caseOf<'LoadRobots', Either<number, string>>('LoadRobots')
const Abort = caseOf('Abort')()
const Switch = caseOf('Switch')()
const Tick = caseOf<'Tick', number>('Tick')

export const update = (action: Action, state: State): [State, Cmd<Action>] => {
  return match(action, {
    LoadRobots: result => [
      {
        ...state,
        robots: RemoteData.fromEither(result)
      },
      Cmd.none
    ],

    Abort: () => [
      { ...state, robots: RemoteData.Succeed('Aborted') },
      Cmd.cancel('foo')
    ],

    Switch: () => [
      {
        ...state,
        tick: !state.tick
      },
      Cmd.none
    ],

    Tick: ts => [
      {
        ...state,
        ts: state.ts + 1
      },
      Cmd.none
    ]
  })
}

// S U B S C R I P T I O N S

export const subscriptions = (state: State): Sub<Action> => {
  if (!state.tick) {
    return Sub.none
  }

  return every(100, Tick)
}

// V I E W

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = React.memo(({ state, dispatch }) => {
  return (
    <div>
      {state.robots.cata({
        Loading: () => (
          <div>
            Loading
            <br />
            <button type="button" onClick={() => dispatch(Abort)}>
              Abort
            </button>
          </div>
        ),

        Failure: error => <div>Error {error}</div>,

        Succeed: value => <div>{value}</div>
      })}
      <br />
      <input
        type="checkbox"
        checked={state.tick}
        onChange={() => dispatch(Switch)}
      />
      count: {state.ts}
    </div>
  )
})
