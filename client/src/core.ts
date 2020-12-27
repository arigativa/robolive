import { PreloadedState, StoreEnhancer, StoreCreator } from 'redux'

const noop = (): void => {
  // do nothing
}

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

const batchUpdate = <S, A>(
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

export interface Store<S, A> {
  dispatch: Dispatch<A>
  getState(): S
  subscribe(listener: VoidFunction): VoidFunction
}

type Office<A> = Map<
  number,
  Manager<A, unknown, unknown, Functor<A>, Functor<A>>
>

interface Bag<A> {
  initManager: InitManager<A>
  cmds: Array<Functor<A>>
  subs: Array<Functor<A>>
}

const getBagSafe = <A>(
  managerId: number,
  initManager: InitManager<A>,
  bags: Map<number, Bag<A>>
): Bag<A> => {
  let bag = bags.get(managerId)

  if (bag == null) {
    bag = { initManager, cmds: [], subs: [] }
    bags.set(managerId, bag)
  }

  return bag
}

const executeEffects = <A>(
  sendToApp: (actions: Array<A>) => void,
  cmd: Cmd<A>,
  sub: Sub<A>,
  office: Office<A>
): void => {
  const bags: Map<number, Bag<A>> = new Map()

  cmd.gather((managerId, initManager: InitManager<A>, myCmd) => {
    getBagSafe(managerId, initManager, bags).cmds.push(myCmd)
  })

  sub.gather((managerId, initManager: InitManager<A>, mySub) => {
    getBagSafe(managerId, initManager, bags).subs.push(mySub)
  })

  // run previous managers with empty effects
  office.forEach((manager, managerId) => {
    if (!bags.has(managerId)) {
      manager.execute([], [])
    }
  })

  // run effects
  bags.forEach(({ initManager, cmds, subs }, managerId) => {
    let manager = office.get(managerId)

    if (manager == null) {
      manager = initManager(sendToApp)
      office.set(managerId, manager)
    }

    manager.execute(cmds, subs)
  })
}

export const createStoreWithEffects = <S, A, Ext, StateExt>(
  createStore: StoreCreator
) => (
  [initialState, initialCmd]: [S, Cmd<A>],
  update: (action: A, state: S) => [S, Cmd<A>],
  subscriptions: (state: S) => Sub<A>,
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> => {
  const office: Office<A> = new Map()

  const effectReducer = (state: S, action: InnerAction<A>): S => {
    if (typeof action.payload === 'undefined') {
      return state
    }

    const [nextState, cmd] = batchUpdate(action, state, update)

    executeEffects(dispatchBatch, cmd, subscriptions(nextState), office)

    return nextState
  }

  const store: Store<S, InnerAction<A>> = createStore(
    effectReducer,
    initialState as PreloadedState<S>,
    enhancer
  )

  const dispatchSingle = (action: A): void => {
    store.dispatch(SingleAction(action))
  }

  const dispatchBatch = (actions: Array<A>): void => {
    store.dispatch(BatchAction(actions))
  }

  executeEffects(dispatchBatch, initialCmd, subscriptions(initialState), office)

  return {
    dispatch: dispatchSingle,
    getState: store.getState,
    subscribe: store.subscribe
  }
}

// E F F E C T S

export interface Functor<T> {
  map<R>(fn: (value: T) => R): Functor<R>
}

type InitManager<
  AppMsg = unknown,
  SelfMsg = unknown,
  State = unknown,
  MyCmd extends Functor<AppMsg> = Functor<AppMsg>,
  MySub extends Functor<AppMsg> = Functor<AppMsg>
> = (
  sendToApp: (actions: Array<AppMsg>) => void
) => Manager<AppMsg, SelfMsg, State, MyCmd, MySub>

type Collector<T> = (
  managerId: number,
  initManager: InitManager,
  value: Functor<T>
) => void

interface Effect<K, T> extends Functor<T> {
  map<R>(fn: (value: T) => R): Effect<K, R>
  gather(collector: Collector<T>, key?: K): void
}
class CreateEffect<K, T> implements Effect<K, T> {
  public constructor(
    private readonly managerId: number,
    private readonly initManager: InitManager,
    private readonly value: Functor<T>
  ) {}

  public map<R>(fn: (value: T) => R): Effect<K, R> {
    return new CreateEffect(
      this.managerId,
      this.initManager,
      this.value.map(fn)
    )
  }

  public gather(
    collector: (
      managerId: number,
      initManager: InitManager,
      value: Functor<T>
    ) => void
  ): void {
    collector(this.managerId, this.initManager, this.value)
  }
}

class BatchEffect<K, T> implements Effect<K, T> {
  public constructor(private readonly cmds: Array<Effect<K, T>>) {}

  public map<R>(fn: (value: T) => R): Effect<K, R> {
    const nextCmds: Array<Effect<K, R>> = new Array(this.cmds.length)

    for (let index = 0; index < this.cmds.length; index++) {
      nextCmds[index] = this.cmds[index].map(fn)
    }

    return new BatchEffect(nextCmds)
  }

  public gather(collector: Collector<T>): void {
    for (const cmd of this.cmds) {
      cmd.gather(collector)
    }
  }
}

const none: Effect<never, never> = new BatchEffect([])

const batch = <K, T>(commands: Array<Effect<K, T>>): Effect<K, T> => {
  const cmds = commands.filter(cmd => cmd !== none)

  switch (cmds.length) {
    case 0:
      return none

    case 1: {
      return cmds[0]
    }

    default:
      return new BatchEffect(cmds)
  }
}

export interface Cmd<T> extends Effect<'Cmd', T> {
  map<R>(fn: (value: T) => R): Cmd<R>
}

export interface Sub<T> extends Effect<'Sub', T> {
  map<R>(fn: (value: T) => R): Sub<R>
}

export interface Router<AppMsg, SelfMsg> {
  sendToApp(msg: AppMsg): void
  sendToSelf(selfMsg: SelfMsg): void
}

export interface EffectFactory<AppMsg, MyCmd, MySub> {
  createCmd<M>(cmd: MyCmd): Cmd<AppMsg & M>
  createSub<M>(sub: MySub): Sub<AppMsg & M>
}

class Manager<
  AppMsg,
  SelfMsg,
  State,
  MyCmd extends Functor<AppMsg>,
  MySub extends Functor<AppMsg>
> {
  private readonly router: Router<AppMsg, SelfMsg>

  public constructor(
    dispatch: (actions: Array<AppMsg>) => void,

    private chainState: Promise<State>,

    private readonly onEffects: (
      router: Router<AppMsg, SelfMsg>,
      cmds: Array<MyCmd>,
      subs: Array<MySub>,
      state: State
    ) => Promise<State>,

    onSelfMsg: (
      sendToApp: (actions: Array<AppMsg>) => void,
      selfMsg: SelfMsg,
      state: State
    ) => Promise<State>
  ) {
    this.router = {
      sendToApp: action => dispatch([action]),
      sendToSelf: selfMsg => {
        this.chainState = this.chainState.then(state =>
          onSelfMsg(dispatch, selfMsg, state)
        )
      }
    }
  }

  public execute(cmds: Array<MyCmd>, subs: Array<MySub>): void {
    this.chainState = this.chainState.then(state =>
      this.onEffects(this.router, cmds, subs, state)
    )
  }
}

let MANAGER_ID = 0

export const registerManager = <
  AppMsg,
  SelfMsg,
  State,
  MyCmd extends Functor<AppMsg>,
  MySub extends Functor<AppMsg>
>({
  init,
  onEffects,
  onSelfMsg
}: {
  init(): Promise<State>

  onEffects(
    router: Router<AppMsg, SelfMsg>,
    cmds: Array<MyCmd>,
    subs: Array<MySub>,
    state: State
  ): Promise<State>

  onSelfMsg(
    sendToApp: (actions: Array<AppMsg>) => void,
    selfMsg: SelfMsg,
    state: State
  ): Promise<State>
}): EffectFactory<AppMsg, MyCmd, MySub> => {
  const managerId = MANAGER_ID++

  const initManager: InitManager<AppMsg, SelfMsg, State, MyCmd, MySub> = (
    sendToApp: (actions: Array<AppMsg>) => void
  ) => {
    return new Manager(sendToApp, init(), onEffects, onSelfMsg)
  }

  return {
    createCmd<M>(cmd: MyCmd): Cmd<AppMsg & M> {
      return new CreateEffect(
        managerId,
        initManager,
        (cmd as unknown) as Functor<AppMsg & M>
      )
    },

    createSub<M>(sub: MySub): Sub<AppMsg & M> {
      return new CreateEffect(
        managerId,
        initManager,
        (sub as unknown) as Functor<AppMsg & M>
      )
    }
  }
}

// C O R E  E F F E C T   M A N A G E M E N T

type CommandsState = Record<string, undefined | VoidFunction>

type SubscriptionsState<AppMsg> = Record<
  string,
  | undefined
  | {
      mailbox: Array<(...args: Array<unknown>) => AppMsg>
      cancel(): void
    }
>
interface CoreState<AppMsg> {
  commands: CommandsState
  subscriptions: SubscriptionsState<AppMsg>
}

interface CoreSelfMsg<AppMsg> {
  execute(
    sendToApp: (actions: Array<AppMsg>) => void,
    state: CoreState<AppMsg>
  ): CoreState<AppMsg>
}

class CoreClearCancelSelfMsg<AppMsg> implements CoreSelfMsg<AppMsg> {
  public constructor(private readonly key: string) {}

  public execute(
    sendToApp: (actions: Array<AppMsg>) => void,
    state: CoreState<AppMsg>
  ): CoreState<AppMsg> {
    if (this.key in state.commands) {
      const { [this.key]: _, ...nextCommandsState } = state.commands

      return {
        commands: nextCommandsState,
        subscriptions: state.subscriptions
      }
    }

    return state
  }
}

class CoreTickSelfMsg<AppMsg> implements CoreSelfMsg<AppMsg> {
  public constructor(
    private readonly key: string,
    private readonly args: Array<unknown>
  ) {}

  public execute(
    sendToApp: (actions: Array<AppMsg>) => void,
    state: CoreState<AppMsg>
  ): CoreState<AppMsg> {
    const bag = state.subscriptions[this.key]

    if (bag == null) {
      return state
    }

    sendToApp(bag.mailbox.map(action => action(this.args)))

    return state
  }
}

type CmdExecutor<T> = (
  done: (value: T) => void,
  onCancel: (key: string, kill: VoidFunction) => void
) => void

interface CoreCmd<T> extends Functor<T> {
  execute(router: Router<T, never>, state: CommandsState): CommandsState
}

class CoreExecuteCmd<T> implements CoreCmd<T> {
  public constructor(private readonly executor: CmdExecutor<T>) {}

  public map<R>(fn: (action: T) => R): CoreCmd<R> {
    return new CoreExecuteCmd((done, onCancel) => {
      this.executor((value: T) => done(fn(value)), onCancel)
    })
  }

  public execute(
    router: Router<T, CoreSelfMsg<T>>,
    commandsState: CommandsState
  ): CommandsState {
    let nextCommandsState = commandsState

    let onCancel = (key: string, kill: VoidFunction): void => {
      // no way to call it twice
      onCancel = noop

      clearCancel = () => router.sendToSelf(new CoreClearCancelSelfMsg(key))

      const cancelPrev = nextCommandsState[key]

      if (typeof cancelPrev === 'function') {
        cancelPrev()
      }

      // onCancel called sync
      nextCommandsState = {
        ...nextCommandsState,
        [key]: () => {
          // no way to call it if canceled
          done = noop

          kill()
        }
      }
    }

    let clearCancel = (): void => {
      // no way to cancel twice
      clearCancel = noop

      // do nothing for cancel if clearCancel has been called sync
      onCancel = noop
    }

    let done = (action: T): void => {
      // no way to call done twice
      done = noop

      // clears cancel if it was assigned in onCancel
      clearCancel()

      router.sendToApp(action)
    }

    this.executor(
      action => done(action),
      (key, kill) => onCancel(key, kill)
    )

    // no way to assign cancel async
    onCancel = noop

    return nextCommandsState
  }
}

class CoreCancelCmd implements CoreCmd<never> {
  public constructor(private readonly key: string) {}

  public map(): CoreCmd<never> {
    return this
  }

  public execute(
    router: Router<never, CoreSelfMsg<never>>,
    commandsState: CommandsState
  ): CommandsState {
    const cancel = commandsState[this.key]

    if (typeof cancel === 'function') {
      const { [this.key]: _, ...nextCommandsState } = commandsState

      cancel()

      return nextCommandsState
    }

    return commandsState
  }
}

type SubListener<A extends Array<unknown>> = (
  tick: (...args: A) => void
) => VoidFunction

interface CoreSub<T> extends Functor<T> {
  register(
    router: Router<T, CoreSelfMsg<T>>,
    prevSubscriptionsState: SubscriptionsState<T>,
    nextSubscriptionsState: SubscriptionsState<T>
  ): void
}

class CoreExecuteSub<T, A extends Array<unknown>> implements CoreSub<T> {
  public constructor(
    private readonly key: string,
    private readonly action: (...args: A) => T,
    private readonly listener: SubListener<A>
  ) {}

  public map<R>(fn: (action: T) => R): CoreSub<R> {
    return new CoreExecuteSub(
      this.key,
      (...args) => fn(this.action(...args)),
      this.listener
    )
  }

  public register(
    router: Router<T, CoreSelfMsg<T>>,
    prevSubscriptionsState: SubscriptionsState<T>,
    nextSubscriptionsState: SubscriptionsState<T>
  ): void {
    const nextBag = nextSubscriptionsState[this.key]

    // subscriptions has been registered at this tick
    if (nextBag != null) {
      nextBag.mailbox.push(this.action)

      return
    }

    const prevBag = prevSubscriptionsState[this.key]

    // subscription was registered at previous tick
    // it will reuse the listener
    if (prevBag != null) {
      nextSubscriptionsState[this.key] = {
        mailbox: [this.action],
        cancel: prevBag.cancel
      }

      return
    }

    const cancel = this.listener((...args) => {
      router.sendToSelf(new CoreTickSelfMsg(this.key, args))
    })

    nextSubscriptionsState[this.key] = {
      mailbox: [this.action],
      cancel
    }
  }
}

const effectManager = registerManager<
  unknown,
  CoreSelfMsg<unknown>,
  CoreState<unknown>,
  CoreCmd<unknown>,
  CoreSub<unknown>
>({
  init: () => {
    return Promise.resolve({
      commands: {},
      subscriptions: {}
    })
  },

  onEffects(router, cmds, subs, state) {
    let nextCommandsState = state.commands
    const nextSubscriptions: SubscriptionsState<unknown> = {}

    for (const cmd of cmds) {
      nextCommandsState = cmd.execute(router, nextCommandsState)
    }

    for (const sub of subs) {
      sub.register(router, state.subscriptions, nextSubscriptions)
    }

    for (const key in state.subscriptions) {
      if (!(key in nextSubscriptions)) {
        state.subscriptions[key]?.cancel()
      }
    }

    return Promise.resolve({
      commands: nextCommandsState,
      subscriptions: nextSubscriptions
    })
  },

  onSelfMsg(sendToApp, msg, state) {
    return Promise.resolve(msg.execute(sendToApp, state))
  }
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Cmd = {
  none: none as Cmd<never>,
  batch: batch as <T>(cmds: Array<Cmd<T>>) => Cmd<T>,

  create<T>(executor: CmdExecutor<T>): Cmd<T> {
    return effectManager.createCmd(new CoreExecuteCmd(executor))
  },

  cancel(key: string): Cmd<never> {
    return effectManager.createCmd(new CoreCancelCmd(key))
  }
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Sub = {
  none: none as Sub<never>,
  batch: batch as <T>(subs: Array<Sub<T>>) => Sub<T>,

  create<T, A extends Array<unknown> = []>(
    key: string,
    action: (...args: A) => T,
    listener: SubListener<A>
  ): Sub<T> {
    return effectManager.createSub(new CoreExecuteSub(key, action, listener))
  }
}
