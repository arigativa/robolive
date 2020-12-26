import { PreloadedState, StoreEnhancer, StoreCreator } from 'redux'

const noop = (): void => {
  // do nothing
}

export interface Cmd<T> {
  map<R>(fn: (action: T) => R): Cmd<R>

  execute(
    register: (executor: CmdExecutor<T>) => void,
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
    const N = this.commands.length
    const tmp: Array<Cmd<R>> = new Array(N)

    for (let index = 0; index < N; index++) {
      tmp[index] = this.commands[index].map(fn)
    }

    return new Batch(tmp)
  }

  public execute(
    register: (executor: CmdExecutor<T>) => void,
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
  public constructor(private readonly executor: CmdExecutor<T>) {}

  public map<R>(fn: (action: T) => R): Cmd<R> {
    return new Effect((done, onCancel) => {
      this.executor((value: T) => done(fn(value)), onCancel)
    })
  }

  public execute(register: (executor: CmdExecutor<T>) => void): void {
    register(this.executor)
  }
}

type CmdExecutor<T> = (
  done: (value: T) => void,
  onCancel: (key: string, kill: () => void) => void
) => void

function create<T>(executor: CmdExecutor<T>): Cmd<T> {
  return new Effect(executor)
}

class Cancel implements Cmd<never> {
  public constructor(private readonly key: string) {}

  public map(): Cmd<never> {
    return this
  }

  public execute(
    register: (executor: CmdExecutor<never>) => void,
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

type SubExecutor<A extends Array<unknown>> = (
  tick: (...args: A) => void
) => () => void

export interface Sub<T> {
  map<R>(fn: (action: T) => R): Sub<R>

  execute(
    register: (
      key: string,
      action: (...args: Array<unknown>) => T,
      executor: SubExecutor<Array<unknown>>
    ) => void
  ): void
}

const subNone: Sub<never> = {
  map(): Sub<never> {
    return subNone
  },

  execute(): void {
    // do nothing
  }
}

class SubBatch<T> implements Sub<T> {
  public constructor(private readonly commands: Array<Sub<T>>) {}

  public map<R>(fn: (action: T) => R): Sub<R> {
    const N = this.commands.length
    const tmp: Array<Sub<R>> = new Array(N)

    for (let index = 0; index < N; index++) {
      tmp[index] = this.commands[index].map(fn)
    }

    return new SubBatch(tmp)
  }

  public execute<A extends Array<unknown>>(
    register: (
      key: string,
      action: (...args: A) => T,
      executor: SubExecutor<A>
    ) => void
  ): void {
    for (const cmd of this.commands) {
      cmd.execute(register)
    }
  }
}

const subBatch = <T>(commands: Array<Sub<T>>): Sub<T> => {
  const tmp: Array<Sub<T>> = commands.filter(sub => sub !== subNone)

  switch (tmp.length) {
    case 0: {
      return subNone
    }

    case 1: {
      return tmp[0]
    }

    default: {
      return new SubBatch(tmp)
    }
  }
}
class SubEffect<T, A extends Array<unknown>> implements Sub<T> {
  public constructor(
    private readonly key: string,
    private readonly action: (...args: A) => T,
    private readonly executor: SubExecutor<A>
  ) {}

  public map<R>(fn: (action: T) => R): Sub<R> {
    return new SubEffect(
      this.key,
      (...args) => fn(this.action(...args)),
      this.executor
    )
  }

  public execute(
    register: (
      key: string,
      action: (...args: A) => T,
      executor: SubExecutor<A>
    ) => void
  ): void {
    register(this.key, this.action, this.executor)
  }
}

const createSub = <T, A extends Array<unknown> = []>(
  key: string,
  action: (...args: A) => T,
  executor: SubExecutor<A>
): Sub<T> => {
  return new SubEffect(key, action, executor)
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Sub = {
  none: subNone,
  batch: subBatch,
  create: createSub
}

type SubState<A> = Map<
  string,
  {
    mailbox: Array<(...args: Array<unknown>) => A>
    cancel(): void
  }
>

/**
 * Dispatches action to be performed in order to update state.
 */
export type Dispatch<A> = (action: A) => void

type InnerAction<A> =
  | { type: 'Single'; payload: A }
  | { type: 'Batch'; payload: Array<A> }

const BatchAction = <A>(payload: Array<A>): InnerAction<A> => {
  return payload.length === 1
    ? SingleAction(payload[0])
    : { type: 'Batch', payload }
}

const SingleAction = <A>(payload: A): InnerAction<A> => ({
  type: 'Single',
  payload
})

const innerUpdate = <S, A>(
  innerAction: InnerAction<A>,
  state: S,
  update: (action: A, state_: S) => [S, Cmd<A>]
): [S, Cmd<A>] => {
  if (innerAction.type === 'Single') {
    const [nextState, cmd] = update(innerAction.payload, state)

    return [nextState, cmd]
  }

  let currentState = state
  const N = innerAction.payload.length
  const commands: Array<Cmd<A>> = new Array(N)

  for (let index = 0; index < N; index++) {
    const [nextState, cmd] = update(innerAction.payload[index], currentState)

    currentState = nextState
    commands[index] = cmd
  }

  return [currentState, Cmd.batch(commands)]
}

export type Unsubscribe = () => void
export interface Store<S, A> {
  dispatch: Dispatch<A>
  getState(): S
  subscribe(listener: () => void): Unsubscribe
}

export const createStoreWithEffects = <S, A, Ext, StateExt>(
  createStore: StoreCreator
) => (
  [initialState, initialCmd]: [S, Cmd<A>],
  update: (action: A, state: S) => [S, Cmd<A>],
  subscriptions: (state: S) => Sub<A>,
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> => {
  const commandsState = new Map<string, () => void>()
  let subscriptionsState: SubState<A> = new Map()

  const executeCmd = (executor: CmdExecutor<A>): void => {
    let done = (action: A): void => {
      clearCancel()
      store.dispatch(SingleAction(action))
    }

    let clearCancel = (): void => {
      onCancel = noop
    }

    let onCancel = (key: string, kill: () => void): void => {
      clearCancel = () => commandsState.delete(key)

      commandsState.get(key)?.()

      commandsState.set(key, () => {
        done = noop
        clearCancel()
        kill()
      })
    }

    setTimeout(() => {
      executor(
        action => done(action),
        (key, kill) => onCancel(key, kill)
      )
    })
  }

  const executeSub = (state: S): void => {
    const sub = subscriptions(state)
    const nextSubState: SubState<A> = new Map()

    sub.execute((key, action, listener) => {
      const nextBag = nextSubState.get(key)

      if (nextBag != null) {
        nextBag.mailbox.push(action)

        return
      }

      const prevBag = subscriptionsState.get(key)

      if (prevBag != null) {
        nextSubState.set(key, {
          mailbox: [action],
          cancel: prevBag.cancel
        })

        return
      }

      const kill = listener((...args) => {
        const bag = subscriptionsState.get(key)

        if (bag == null) {
          return
        }

        store.dispatch(BatchAction(bag.mailbox.map(letter => letter(...args))))
      })

      nextSubState.set(key, {
        mailbox: [action],
        cancel: () => {
          subscriptionsState.delete(key)
          kill()
        }
      })
    })

    subscriptionsState.forEach((bag, key) => {
      if (!nextSubState.has(key)) {
        bag.cancel()
      }
    })

    subscriptionsState = nextSubState
  }

  const effectReducer = (state: S, action: InnerAction<A>): S => {
    if (typeof action.payload === 'undefined') {
      return state
    }

    const [nextState, cmd] = innerUpdate(action, state, update)

    cmd.execute(executeCmd, commandsState)
    executeSub(nextState)

    return nextState
  }

  const store: Store<S, InnerAction<A>> = createStore(
    effectReducer,
    initialState as PreloadedState<S>,
    enhancer
  )

  executeSub(store.getState())

  initialCmd.execute(executeCmd, commandsState)

  return {
    dispatch: action => {
      store.dispatch(SingleAction(action))
    },

    getState: store.getState,
    subscribe: store.subscribe
  }
}
