import React from 'react'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData'

import { Effects, Dispatch, caseOf, match } from 'core'

// S T A T E

export type State = {
  robots: RemoteData<string, Array<number>>
}

export const init: [State, Effects<Action>] = [
  {
    robots: RemoteData.Loading
  },
  []
]

// U P D A T E

export type Action = ReturnType<typeof LoadRobots>

const LoadRobots = caseOf<'LoadRobots', Either<string, Array<number>>>(
  'LoadRobots'
)

export const update = (
  action: Action,
  state: State
): [State, Effects<Action>] => {
  return match(action, {
    LoadRobots: result => [
      {
        ...state,
        robots: RemoteData.fromEither(result)
      },
      []
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
