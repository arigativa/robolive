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

  execute(register: (promise: Promise<T>) => void): void
}

const none: Cmd<never> = {
  map(): Cmd<never> {
    return none
  },

  execute(): void {
    // do nothing
  }
}

class Mapper<T, R> implements Cmd<R> {
  public constructor(
    private readonly fn: (action: T) => R,
    private readonly cmd: Cmd<T>
  ) {}

  public map<G>(fn: (action: R) => G): Cmd<G> {
    return new Mapper(fn, this)
  }

  public execute(register: (effect: Promise<R>) => void): void {
    this.cmd.execute((effect: Promise<T>): void => {
      register(effect.then(this.fn))
    })
  }
}

class Batch<T> implements Cmd<T> {
  public constructor(private readonly commands: Array<Cmd<T>>) {}

  public map<R>(fn: (action: T) => R): Cmd<R> {
    return new Mapper(fn, this)
  }

  public execute(register: (effect: Promise<T>) => void): void {
    for (const cmd of this.commands) {
      cmd.execute(register)
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
  public constructor(private readonly effect: () => Promise<T>) {}

  public map<R>(fn: (action: T) => R): Cmd<R> {
    return new Mapper(fn, this)
  }

  public execute(register: (effect: Promise<T>) => void): void {
    register(this.effect())
  }
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Cmd = {
  none,
  batch,
  of<T>(effect: () => Promise<T>): Cmd<T> {
    return new Effect(effect)
  }
}

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

  const executor = (effect: Promise<A>): void => {
    effect.then(store.dispatch)
  }

  const effectReducer = (state: S, action: A): S => {
    if (!initialized) {
      initialized = true

      return state
    }

    const [nextState, cmd] = update(action, state)

    cmd.execute(executor)

    return nextState
  }

  const store = createStore(
    effectReducer,
    initialState as PreloadedState<S>,
    enhancer
  )

  initialCmd.execute(executor)

  return store
}
