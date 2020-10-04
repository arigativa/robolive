import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData/Optional'

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
  | { type: 'CangeUsername'; value: string }
  | { type: 'SignIn' }
  | { type: 'Register'; result: Either<string, null> }
