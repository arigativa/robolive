import { PreloadedState, StoreEnhancer, StoreCreator } from 'redux'

const noop = (): void => {
  // do nothing
}

// export interface Cmd<T> {
//   map<R>(fn: (action: T) => R): Cmd<R>

//   execute(
//     register: (executor: CmdExecutor<T>) => void,
//     state: Map<string, VoidFunction>
//   ): void
// }

// const none: Cmd<never> = {
//   map(): Cmd<never> {
//     return none
//   },

//   execute(): void {
//     // do nothing
//   }
// }

// class Batch<T> implements Cmd<T> {
//   public constructor(private readonly commands: Array<Cmd<T>>) {}

//   public map<R>(fn: (action: T) => R): Cmd<R> {
//     const N = this.commands.length
//     const tmp: Array<Cmd<R>> = new Array(N)

//     for (let index = 0; index < N; index++) {
//       tmp[index] = this.commands[index].map(fn)
//     }

//     return new Batch(tmp)
//   }

//   public execute(
//     register: (executor: CmdExecutor<T>) => void,
//     state: Map<string, VoidFunction>
//   ): void {
//     for (const cmd of this.commands) {
//       cmd.execute(register, state)
//     }
//   }
// }

// const batch = <T>(commands: Array<Cmd<T>>): Cmd<T> => {
//   const commands_: Array<Cmd<T>> = commands.filter(cmd => cmd !== none)

//   switch (commands_.length) {
//     case 0: {
//       return none
//     }

//     case 1: {
//       return commands_[0]
//     }

//     default: {
//       return new Batch(commands_)
//     }
//   }
// }

// class Effect<T> implements Cmd<T> {
//   public constructor(private readonly executor: CmdExecutor<T>) {}

//   public map<R>(fn: (action: T) => R): Cmd<R> {
//     return new Effect((done, onCancel) => {
//       this.executor((value: T) => done(fn(value)), onCancel)
//     })
//   }

//   public execute(register: (executor: CmdExecutor<T>) => void): void {
//     register(this.executor)
//   }
// }

// function create<T>(executor: CmdExecutor<T>): Cmd<T> {
//   return new Effect(executor)
// }

// class Cancel implements Cmd<never> {
//   public constructor(private readonly key: string) {}

//   public map(): Cmd<never> {
//     return this
//   }

//   public execute(
//     register: (executor: CmdExecutor<never>) => void,
//     state: Map<string, VoidFunction>
//   ): void {
//     register(() => {
//       state.get(this.key)?.()
//     })
//   }
// }

// const cancel = (key: string): Cmd<never> => new Cancel(key)

// // eslint-disable-next-line @typescript-eslint/no-redeclare
// export const Cmd = { none, batch, create, cancel }

// export interface Sub<T> {
//   map<R>(fn: (action: T) => R): Sub<R>

//   execute(
//     register: (
//       key: string,
//       action: (...args: Array<unknown>) => T,
//       executor: SubExecutor<Array<unknown>>
//     ) => void
//   ): void
// }

// const subNone: Sub<never> = {
//   map(): Sub<never> {
//     return subNone
//   },

//   execute(): void {
//     // do nothing
//   }
// }

// class SubBatch<T> implements Sub<T> {
//   public constructor(private readonly commands: Array<Sub<T>>) {}

//   public map<R>(fn: (action: T) => R): Sub<R> {
//     const N = this.commands.length
//     const tmp: Array<Sub<R>> = new Array(N)

//     for (let index = 0; index < N; index++) {
//       tmp[index] = this.commands[index].map(fn)
//     }

//     return new SubBatch(tmp)
//   }

//   public execute<A extends Array<unknown>>(
//     register: (
//       key: string,
//       action: (...args: A) => T,
//       executor: SubExecutor<A>
//     ) => void
//   ): void {
//     for (const cmd of this.commands) {
//       cmd.execute(register)
//     }
//   }
// }

// const subBatch = <T>(commands: Array<Sub<T>>): Sub<T> => {
//   const tmp: Array<Sub<T>> = commands.filter(sub => sub !== subNone)

//   switch (tmp.length) {
//     case 0: {
//       return subNone
//     }

//     case 1: {
//       return tmp[0]
//     }

//     default: {
//       return new SubBatch(tmp)
//     }
//   }
// }
// class SubEffect<T, A extends Array<unknown>> implements Sub<T> {
//   public constructor(
//     private readonly key: string,
//     private readonly action: (...args: A) => T,
//     private readonly executor: SubExecutor<A>
//   ) {}

//   public map<R>(fn: (action: T) => R): Sub<R> {
//     return new SubEffect(
//       this.key,
//       (...args) => fn(this.action(...args)),
//       this.executor
//     )
//   }

//   public execute(
//     register: (
//       key: string,
//       action: (...args: A) => T,
//       executor: SubExecutor<A>
//     ) => void
//   ): void {
//     register(this.key, this.action, this.executor)
//   }
// }

// const createSub = <T, A extends Array<unknown> = []>(
//   key: string,
//   action: (...args: A) => T,
//   executor: SubExecutor<A>
// ): Sub<T> => {
//   return new SubEffect(key, action, executor)
// }

// // eslint-disable-next-line @typescript-eslint/no-redeclare
// export const Sub = {
//   none: subNone,
//   batch: subBatch,
//   create: createSub
// }

// type SubState<A> = Map<
//   string,
//   {
//     mailbox: Array<(...args: Array<unknown>) => A>
//     cancel(): void
//   }
// >

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

export type Unsubscribe = VoidFunction
export interface Store<S, A> {
  dispatch: Dispatch<A>
  getState(): S
  subscribe(listener: VoidFunction): Unsubscribe
}

export const createStoreWithEffects = <S, A, Ext, StateExt>(
  createStore: StoreCreator
) => (
  [initialState, initialCmd]: [S, Cmd<A>],
  update: (action: A, state: S) => [S, Cmd<A>],
  subscriptions: (state: S) => Sub<A>,
  enhancer?: StoreEnhancer<Ext, StateExt>
): Store<S, A> => {
  const office: Map<
    number,
    {
      chainState: Promise<unknown>
      run: Run
    }
  > = new Map()

  const exec = (cmd: Cmd<A>, sub: Sub<A>): void => {
    const bags: Map<
      number,
      {
        run: Run
        cmds: Array<Functor<A>>
        subs: Array<Functor<A>>
      }
    > = new Map()

    cmd.gather((managerId, run, myCmd) => {
      const bag = bags.get(managerId) ?? {
        run,
        cmds: [],
        subs: []
      }
      bags.set(managerId, bag)
      bag.cmds.push(myCmd)
    })
    sub.gather((managerId, run, mySub) => {
      const bag = bags.get(managerId) ?? {
        run,
        cmds: [],
        subs: []
      }
      bags.set(managerId, bag)
      bag.subs.push(mySub)
    })

    // run previous managers with empty effects
    office.forEach(({ chainState, run }, managerId) => {
      if (!bags.has(managerId)) {
        office.set(managerId, {
          chainState: run(dispatchBatch, [], [], chainState),
          run
        })
      }
    })

    // run effects
    bags.forEach(({ run, cmds, subs }, managerId) => {
      office.set(managerId, {
        chainState: run(
          dispatchBatch,
          cmds,
          subs,
          office.get(managerId)?.chainState
        ),
        run
      })
    })
  }

  // const executeCmd = (executor: CmdExecutor<A>): void => {
  //   let done = (action: A): void => {
  //     clearCancel()
  //     store.dispatch(SingleAction(action))
  //   }

  //   let clearCancel = (): void => {
  //     onCancel = noop
  //   }

  //   let onCancel = (key: string, kill: VoidFunction): void => {
  //     clearCancel = () => commandsState.delete(key)

  //     commandsState.get(key)?.()

  //     commandsState.set(key, () => {
  //       done = noop
  //       clearCancel()
  //       kill()
  //     })
  //   }

  //   setTimeout(() => {
  //     executor(
  //       action => done(action),
  //       (key, kill) => onCancel(key, kill)
  //     )
  //   })
  // }

  // const executeSub = (state: S): void => {
  //   const sub = subscriptions(state)
  //   const nextSubState: SubState<A> = new Map()

  //   sub.execute((key, action, listener) => {
  //     const nextBag = nextSubState.get(key)

  //     if (nextBag != null) {
  //       nextBag.mailbox.push(action)

  //       return
  //     }

  //     const prevBag = subscriptionsState.get(key)

  //     if (prevBag != null) {
  //       nextSubState.set(key, {
  //         mailbox: [action],
  //         cancel: prevBag.cancel
  //       })

  //       return
  //     }

  //     const kill = listener((...args) => {
  //       const bag = subscriptionsState.get(key)

  //       if (bag == null) {
  //         return
  //       }

  //       store.dispatch(BatchAction(bag.mailbox.map(letter => letter(...args))))
  //     })

  //     nextSubState.set(key, {
  //       mailbox: [action],
  //       cancel: () => {
  //         subscriptionsState.delete(key)
  //         kill()
  //       }
  //     })
  //   })

  //   subscriptionsState.forEach((bag, key) => {
  //     if (!nextSubState.has(key)) {
  //       bag.cancel()
  //     }
  //   })

  //   subscriptionsState = nextSubState
  // }

  const effectReducer = (state: S, action: InnerAction<A>): S => {
    if (typeof action.payload === 'undefined') {
      return state
    }

    const [nextState, cmd] = innerUpdate(action, state, update)

    // cmd.execute(executeCmd, commandsState)
    // executeSub(nextState)
    exec(cmd, subscriptions(nextState))

    return nextState
  }

  const store: Store<S, InnerAction<A>> = createStore(
    effectReducer,
    initialState as PreloadedState<S>,
    enhancer
  )

  // executeSub(store.getState())

  // initialCmd.execute(executeCmd, commandsState)

  const dispatch = (action: A): void => {
    store.dispatch(SingleAction(action))
  }

  const dispatchBatch = (actions: Array<A>): void => {
    store.dispatch(BatchAction(actions))
  }

  exec(initialCmd, subscriptions(initialState))

  return {
    dispatch,
    getState: store.getState,
    subscribe: store.subscribe
  }
}

// ----------------------------------------------------

interface Functor<T> {
  map<R>(fn: (value: T) => R): Functor<R>
}

type Run<
  AppMsg = unknown,
  State = unknown,
  MyCmd = unknown,
  MySub = unknown
> = (
  sendToApp: (msg: Array<AppMsg>) => void,
  cmds: Array<MyCmd>,
  subs: Array<MySub>,
  chainState?: Promise<State>
) => Promise<State>

type Collector<T> = (managerId: number, run: Run, value: Functor<T>) => void

interface IEffect<K, T> extends Functor<T> {
  map<R>(fn: (value: T) => R): IEffect<K, R>
  gather(collector: Collector<T>, key?: K): void
}
class IEffectCreator<K, T> implements IEffect<K, T> {
  public constructor(
    private readonly managerId: number,
    private readonly run: Run,
    private readonly value: Functor<T>
  ) {}

  public map<R>(fn: (value: T) => R): IEffect<K, R> {
    return new IEffectCreator(this.managerId, this.run, this.value.map(fn))
  }

  public gather(
    collector: (managerId: number, run: Run, value: Functor<T>) => void
  ): void {
    collector(this.managerId, this.run, this.value)
  }
}

class IEffectBatch<K, T> implements IEffect<K, T> {
  public constructor(private readonly cmds: Array<IEffect<K, T>>) {}

  public map<R>(fn: (value: T) => R): IEffect<K, R> {
    const nextCmds: Array<IEffect<K, R>> = new Array(this.cmds.length)

    for (let index = 0; index < this.cmds.length; index++) {
      nextCmds[index] = this.cmds[index].map(fn)
    }

    return new IEffectBatch(nextCmds)
  }

  public gather(collector: Collector<T>): void {
    for (const cmd of this.cmds) {
      cmd.gather(collector)
    }
  }
}

const iEffectNone: IEffect<never, never> = new IEffectBatch([])

const iEffectBatch = <K, T>(commands: Array<IEffect<K, T>>): IEffect<K, T> => {
  const cmds = commands.filter(cmd => cmd !== iEffectNone)

  switch (cmds.length) {
    case 0:
      return iEffectNone

    case 1: {
      return cmds[0]
    }

    default:
      return new IEffectBatch(cmds)
  }
}

export interface Cmd<T> extends IEffect<'Cmd', T> {
  map<R>(fn: (value: T) => R): Cmd<R>
}

export interface Sub<T> extends IEffect<'Sub', T> {
  map<R>(fn: (value: T) => R): Sub<R>
}

interface Router<AppMsg, SelfMsg> {
  sendToApp(msg: AppMsg): void
  sendToSelf(selfMsg: SelfMsg): void
}

interface Manager<AppMsg, MyCmd, MySub> {
  createCmd<M>(cmd: MyCmd): Cmd<AppMsg & M>
  createSub<M>(sub: MySub): Sub<AppMsg & M>
}

let MANAGER_ID = 0

const registerManager = <
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
    sendToApp: (msg: Array<AppMsg>) => void,
    selfMsg: SelfMsg,
    state: State
  ): Promise<State>
}): Manager<AppMsg, MyCmd, MySub> => {
  const managerId = MANAGER_ID++

  const loop: Run<AppMsg, State, MyCmd, MySub> = (
    dispatch,
    cmds,
    subs,
    chainState = init()
  ) => {
    let nextState = chainState

    const sendToSelf = (selfMsg: SelfMsg): void => {
      nextState = nextState.then(state => onSelfMsg(dispatch, selfMsg, state))
    }

    const router: Router<AppMsg, SelfMsg> = {
      sendToApp: action => dispatch([action]),
      sendToSelf
    }

    nextState = nextState.then(state => onEffects(router, cmds, subs, state))

    return nextState
  }

  return {
    createCmd<M>(cmd: MyCmd): Cmd<AppMsg & M> {
      return new IEffectCreator(
        managerId,
        loop,
        (cmd as unknown) as Functor<AppMsg & M>
      )
    },

    createSub<M>(sub: MySub): Sub<AppMsg & M> {
      return new IEffectCreator(
        managerId,
        loop,
        (sub as unknown) as Functor<AppMsg & M>
      )
    }
  }
}
// ---- CORE

type CommandsState = Record<string, undefined | VoidFunction>

type SubscriptionsState<AppMsg> = Record<
  string,
  | undefined
  | {
      mailbox: Array<(...args: Array<unknown>) => AppMsg>
      cancel(): void
    }
>
interface EffectState<AppMsg> {
  commands: CommandsState
  subscriptions: SubscriptionsState<AppMsg>
}

const cancelCommand = (
  key: string,
  commandsState: CommandsState
): CommandsState => {
  const cancel = commandsState[key]

  if (typeof cancel === 'function') {
    const { [key]: _, ...nextCommandsState } = commandsState

    cancel()

    return nextCommandsState
  }

  return commandsState
}
interface CoreSelfMsg<AppMsg> {
  execute(
    sendToApp: (msg: Array<AppMsg>) => void,
    state: EffectState<AppMsg>
  ): EffectState<AppMsg>
}

class CoreCancelSelfMsg<AppMsg> implements CoreSelfMsg<AppMsg> {
  public constructor(private readonly key: string) {}

  public execute(
    _: (msg: Array<AppMsg>) => void,
    state: EffectState<AppMsg>
  ): EffectState<AppMsg> {
    const nextCommands = cancelCommand(this.key, state.commands)

    if (state.commands === nextCommands) {
      return state
    }

    return {
      commands: nextCommands,
      subscriptions: state.subscriptions
    }
  }
}

class CoreTickSelfMsg<A extends Array<unknown>, AppMsg>
  implements CoreSelfMsg<AppMsg> {
  public constructor(private readonly key: string, private readonly args: A) {}

  public execute(
    sendToApp: (msg: Array<AppMsg>) => void,
    state: EffectState<AppMsg>
  ): EffectState<AppMsg> {
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

class CoreCmdExecutor<T> implements CoreCmd<T> {
  public constructor(private readonly executor: CmdExecutor<T>) {}

  public map<R>(fn: (action: T) => R): CoreCmd<R> {
    return new CoreCmdExecutor((done, onCancel) => {
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

      clearCancel = () => router.sendToSelf(new CoreCancelSelfMsg(key))

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

      // clears killer if it was assigned in onCancel
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

class CoreCmdCancel implements CoreCmd<never> {
  public constructor(private readonly key: string) {}

  public map(): CoreCmd<never> {
    return this
  }

  public execute(
    _: Router<never, CoreSelfMsg<never>>,
    commandsState: CommandsState
  ): CommandsState {
    return cancelCommand(this.key, commandsState)
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

class CoreSubExecutor<T, A extends Array<unknown>> implements CoreSub<T> {
  public constructor(
    private readonly key: string,
    private readonly action: (...args: A) => T,
    private readonly listener: SubListener<A>
  ) {}

  public map<R>(fn: (action: T) => R): CoreSub<R> {
    return new CoreSubExecutor(
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
  EffectState<unknown>,
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
        nextSubscriptions[key]?.cancel()
      }
    }

    return Promise.resolve({
      commands: nextCommandsState,
      subscriptions: nextSubscriptions
    })
  },

  onSelfMsg(router, msg, state) {
    return Promise.resolve(state)
  }
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Cmd = {
  none: iEffectNone as Cmd<never>,
  batch: iEffectBatch as <T>(cmds: Array<Cmd<T>>) => Cmd<T>,

  create<T>(executor: CmdExecutor<T>): Cmd<T> {
    return effectManager.createCmd(new CoreCmdExecutor(executor))
  },

  cancel(key: string): Cmd<never> {
    return effectManager.createCmd(new CoreCmdCancel(key))
  }
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Sub = {
  none: iEffectNone as Sub<never>,
  batch: iEffectBatch as <T>(subs: Array<Sub<T>>) => Sub<T>,

  create<T, A extends Array<unknown> = []>(
    key: string,
    action: (...args: A) => T,
    listener: SubListener<A>
  ): Sub<T> {
    return effectManager.createSub(new CoreSubExecutor(key, action, listener))
  }
}
