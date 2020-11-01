import React from 'react'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData'
import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Heading,
  Button
} from '@chakra-ui/core'

import { Effects, Dispatch, caseOf, match } from 'core'

// S T A T E

export type State = {
  agents: RemoteData<string, Array<number>>
}

export const init: [State, Effects<Action>] = [
  {
    agents: RemoteData.Loading
  },
  []
]

// U P D A T E

export type Action = ReturnType<typeof LoadAgents>

const LoadAgents = caseOf<'LoadAgents', Either<string, Array<number>>>(
  'LoadAgents'
)
