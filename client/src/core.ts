import {
  Action,
  PreloadedState,
  StoreEnhancer,
  StoreCreator,
  Store
} from 'redux'

export type Case<T extends string = string, P = never> = {
  type: T
  payload: P
}

export type CreateCaseWithoutPayload<T extends string = string> = {
  type: T
  (): Case<T>
}

export type CreateCaseWithPayload<T extends string = string, P = never> = {
  type: T
  (payload: P): Case<T, P>
}

export function caseOf<T extends string>(type: T): CreateCaseWithoutPayload<T>
export function caseOf<T extends string, P>(
  type: T
): CreateCaseWithPayload<T, P>
export function caseOf<T extends string, P>(
  type: T
): CreateCaseWithPayload<T, P> {
  const creator = (payload: P): Case<T, P> => ({ type, payload })

  creator.type = type

  return creator
}

type CaseOfSchema<A extends Case<string, unknown>, R> = {
  [K in A['type']]: (payload: Extract<A, { type: K }>['payload']) => R
}

export type Schema<A extends Case<string, unknown>, R> =
  | CaseOfSchema<A, R>
  | (Partial<CaseOfSchema<A, R>> & { _(): R })

export const match = <A extends Case<string, unknown>, R>(
  case_: A,
  schema: Schema<A, R>
): R => {
  if (case_.type in schema) {
    return (schema as Record<string, (payload: unknown) => R>)[case_.type](
      case_.payload
    )
  }

  return (schema as { _(): R })._()
}

const noop = (): void => {
  // do nothing
}

/**
 * Effect allows to call Action in async moment.
 * Seems like redux-thunk but it comes from reducer (update)
 * but not from action.
 * This small difference makes possible to get rid of properties
 * and handlers drilling and keep all state global at the same time
 * when the app becomes bigger and bigger.
 *
 * This is an extremely simplified [redux-loop](https://github.com/redux-loop/redux-loop)
 */

export interface Cmd<T> {
  map<R>(fn: (action: T) => R): Cmd<R>

  execute(
    register: (executor: Executor<T>) => void,
    state: Map<string, () => void>
  ): void
}

const none: Cmd<never> = {
  map(): Cmd<never> {
    return none
  },

  execute(): void {
    // do nothing
  }
}

class Batch<T> implements Cmd<T> {
  public constructor(private readonly commands: Array<Cmd<T>>) {}

  public map<R>(fn: (action: T) => R): Cmd<R> {
    return new Batch(this.commands.map(cmd => cmd.map(fn)))
  }

  public execute(
    register: (executor: Executor<T>) => void,
    state: Map<string, () => void>
  ): void {
    for (const cmd of this.commands) {
      cmd.execute(register, state)
    }
  }
}

const batch = <T>(commands: Array<Cmd<T>>): Cmd<T> => {
  const commands_: Array<Cmd<T>> = commands.filter(cmd => cmd !== none)

  switch (commands_.length) {
    case 0: {
      return none
    }

    case 1: {
      return commands_[0]
    }

    default: {
      return new Batch(commands_)
    }
  }
}

class Effect<T> implements Cmd<T> {
  public constructor(private readonly executor: Executor<T>) {}

  public map<R>(fn: (action: T) => R): Cmd<R> {
    return new Effect((done, onCancel) => {
      this.executor((value: T) => done(fn(value)), onCancel)
    })
  }

  public execute(register: (executor: Executor<T>) => void): void {
    register(this.executor)
  }
}

type Executor<T> = (
  done: (value: T) => void,
  onCancel: (key: string, kill: () => void) => void
) => void

function create<T>(executor: Executor<T>): Cmd<T> {
  return new Effect(executor)
}

class Cancel implements Cmd<never> {
  public constructor(private readonly key: string) {}

  public map(): Cmd<never> {
    return this
  }

  public execute(
    register: (executor: Executor<never>) => void,
    state: Map<string, () => void>
  ): void {
    register(() => {
      state.get(this.key)?.()
    })
  }
}

const cancel = (key: string): Cmd<never> => new Cancel(key)

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Cmd = { none, batch, create, cancel }

/**
 * Dispatches action to be performed in order to update state.
 */
export type Dispatch<A> = (action: A) => void

/**
 * Creates redux store fabric.
 * Returns a fabric to create redux store with initial state, initial effects
 * and update function to produce new state and new side effects.
 *
 * @param createStore original redux.createStore fabric
 *
 * @example
 * type State = {
 *   count: number
 * }
 *
 * type Action =
 *   | { type: 'DelayedIncrement'; delay: number }
 *   | { type: 'Increment' }
 *
 * const store = createStoreWithEffects(redux.createStore)(
 * [
 *   { count: 0 },
 *   [
 *     dispatch => {
 *       setTimeout(() => {
 *         dispatch({ type: 'Increment' })
 *       }, 500)
 *     }
 *   ]
 * ],
 *
 * function update(action: Action, state: State): [State, Effects<Action>] {
 *   switch (action.type) {
 *     case 'DelayedIncrement':
 *       return [
 *         state,
 *         [
 *           dispatch => {
 *             setTimeout(() => {
 *               dispatch({ type: 'Increment' })
 *             }, action.delay)
 *           }
 *         ]
 *       ]
 *
 *     case 'Increment':
 *       return [{ ...state, count: state.count + 1 }, []]
 *   }
 * })
 */
export const createStoreWithEffects = <S, A extends Action, Ext, StateExt>(
  createStore: StoreCreator
) => (
  [initialState, initialCmd]: [S, Cmd<A>],
  update: (action: A, state: S) => [S, Cmd<A>],
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> => {
  let initialized = false
  const commandsState = new Map<string, () => void>()

  const executeCmd = (executor: Executor<A>): void => {
    let clearCancel = (): void => {
      onCancel = noop
    }

    let onCancel = (key: string, kill: () => void): void => {
      clearCancel = () => commandsState.delete(key)

      commandsState.set(key, () => {
        clearCancel()
        kill()
      })
    }

    executor(
      action => {
        clearCancel()
        store.dispatch(action)
      },
      (key, kill) => {
        onCancel(key, kill)
      }
    )
  }

  const effectReducer = (state: S, action: A): S => {
    if (!initialized) {
      initialized = true

      return state
    }

    const [nextState, cmd] = update(action, state)

    cmd.execute(executeCmd, commandsState)

    return nextState
  }

  const store = createStore(
    effectReducer,
    initialState as PreloadedState<S>,
    enhancer
  )

  initialCmd.execute(executeCmd, commandsState)

  return store
}
