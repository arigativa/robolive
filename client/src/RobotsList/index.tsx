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
  robots: RemoteData<string, Array<number>>
}

export const init: [State, Cmd<Action>] = [
  {
    robots: RemoteData.Loading
  },
  Cmd.create(done => {
    req.agentList(new AgentListRequest(), new BrowserHeaders(), (err, data) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error(err)
      } else {
        // eslint-disable-next-line no-console
        console.log(data)
      }
    })

    setTimeout(() => {
      done(LoadRobots(Either.Right([])))
    }, 2000)
  })
]

// U P D A T E

export type Action = ReturnType<typeof LoadRobots>

const LoadRobots = caseOf<'LoadRobots', Either<string, Array<number>>>(
  'LoadRobots'
)

export const update = (action: Action, state: State): [State, Cmd<Action>] => {
  return match(action, {
    LoadRobots: result => [
      {
        ...state,
        robots: RemoteData.fromEither(result)
      },
      Cmd.none
    ]
  })
}

// V I E W

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = ({ state, dispatch }) =>
  state.robots.cata({
    Loading: () => <div>Loading</div>,

    Failure: () => <div>Error</div>,

    Succeed: () => <div>OK</div>
  })
