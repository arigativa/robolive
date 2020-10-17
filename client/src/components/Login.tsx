import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData/Optional'

import { CaseOf, Effects } from 'core'

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

const SignIn = CaseOf('SignIn')()
const Register = CaseOf<'Register', Either<string, null>>('Register')
const ChangeUsername = CaseOf<'ChangeUsername', string>('ChangeUsername')

export type Stage = ReturnType<typeof Updated> | ReturnType<typeof Registered>

const Updated = CaseOf<'Updated', [State, Effects<Action>]>('Updated')
const Registered = CaseOf<'Registered', string>('Registered')
