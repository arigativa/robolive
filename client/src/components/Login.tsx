import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData/Optional'

import { caseOf, match, Effects } from 'core'

// S T A T E

export type State = {
  username: string
  registration: RemoteData<string, never>
}

export const initial: State = {
  username: 'robohuman',
  registration: RemoteData.NotAsked
}

// U P D A T E

export type Action =
  | typeof SignIn
  | ReturnType<typeof Register>
  | ReturnType<typeof ChangeUsername>

const SignIn = caseOf('SignIn')()
const Register = caseOf<'Register', Either<string, null>>('Register')
const ChangeUsername = caseOf<'ChangeUsername', string>('ChangeUsername')

export type Stage = ReturnType<typeof Updated> | ReturnType<typeof Registered>

const Updated = caseOf<'Updated', [State, Effects<Action>]>('Updated')
const Registered = caseOf<'Registered', string>('Registered')

export const update = (action: Action, state: State): Stage => {
  return match<Action, Stage>(
    {
      SignIn: () => Updated([state, []]),
      ChangeUsername: Registered,
      _: () => Updated([state, []])
    },
    action
  )
}
