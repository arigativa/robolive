import { PreloadedState, StoreEnhancer, StoreCreator, Store } from 'redux'

import { once } from 'utils'

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
  schema: Schema<A, R>,
  case_: A
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
export type Effect<A> = (dispatch: Dispatch<A>) => void

/**
 * An array of effects
 */
export type Effects<A> = Array<Effect<A>>

/**
 * Transforms effect to produce R action instead of A action.
 *
 * @param tagger function to transform A → R
 * @param effect effect producing A
 */
export const mapEffect = <A, R>(
  tagger: (action: A) => R,
  effect: Effect<A>
): Effect<R> => {
  return dispatch => effect(action => dispatch(tagger(action)))
}

/**
 * Transforms effects to produce R actions instead of A actions.
 *
 * @param tagger function to transform A → R
 * @param effects effects producing A
 * @see mapEffect
 */
export const mapEffects = <A, R>(
  tagger: (action: A) => R,
  effects: Effects<A>
): Effects<R> => {
  return effects.map(effect => mapEffect(tagger, effect))
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
export const createStoreWithEffects = <S, A extends Case, Ext, StateExt>(
  createStore: StoreCreator
) => (
  [initialState, initialEffects]: [S, Effects<A>],
  update: (action: A, state: S) => [S, Effects<A>],
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> => {
  let initialized = false

  const effectReducer = (state: S, action: A): S => {
    if (!initialized) {
      initialized = true

      return state
    }

    const [nextState, effects] = update(action, state)

    executeEffects(effects)

    return nextState
  }

  const store = createStore(
    effectReducer,
    initialState as PreloadedState<S>,
    enhancer
  )

  const executeEffects = (effects: Effects<A>): void => {
    for (const effect of effects) {
      // make sure dispatch is called just once
      // in future Effect might be a function returns a Promise
      // so it wouldn't to pass dispatch at all
      effect(once(store.dispatch))
    }
  }

  executeEffects(initialEffects)

  return store
}
