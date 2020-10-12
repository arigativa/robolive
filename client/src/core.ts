import {
  Action as ReduxAction,
  PreloadedState,
  StoreEnhancer,
  StoreCreator,
  Store
} from 'redux'

import { once } from 'utils'

export type Action = ReduxAction

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
export const createStoreWithEffects = <S, A extends Action, Ext, StateExt>(
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
