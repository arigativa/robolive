import React from 'react'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData'

import { Cmd, Dispatch, caseOf, match } from 'core'
import { AgentListRequest } from '../generated/Info_pb'
import { InfoEndpointClient } from '../generated/Info_pb_service'
import { BrowserHeaders } from 'browser-headers'

const req = new InfoEndpointClient('https://localhost:3477')

// S T A T E

export type State = {
  robots: RemoteData<number, string>
}

export const init: [State, Cmd<Action>] = [
  {
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

export type Action = ReturnType<typeof LoadRobots> | typeof Abort

const LoadRobots = caseOf<'LoadRobots', Either<number, string>>('LoadRobots')

const Abort = caseOf('Abort')()

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
    ]
  })
}

// V I E W

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = ({ state, dispatch }) =>
  state.robots.cata({
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
  })
