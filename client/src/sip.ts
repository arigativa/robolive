import { WebSocketInterface, UA } from 'jssip/lib/JsSIP'
import { CallListener, EndListener, RTCSession } from 'jssip/lib/RTCSession'
import { debug } from 'jssip/lib/JsSIP'
import { Functor, Router, Cmd, Sub, registerManager } from 'core'
import { CaseOf, CaseCreator } from 'utils'

debug.enable('JsSIP:*')

interface NewRoom<AppMsg> {
  registerSession(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    userAgent: UA,
    options: ConnectionOptions
  ): NewRoom<AppMsg>

  registerStream(router: Router<AppMsg, SipSelfMsg<AppMsg>>): NewRoom<AppMsg>

  dispatchStream(tagger: (stream: MediaStream) => AppMsg): NewRoom<AppMsg>

  dispatchInfo(info: string): NewRoom<AppMsg>

  pushListener(listener: (event: ListenEvent) => AppMsg): NewRoom<AppMsg>

  clearListeners(): NewRoom<AppMsg>

  dispatchEvent(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    event: ListenEvent
  ): void

  close(): void
}

class EmptyRoom<AppMsg> implements NewRoom<AppMsg> {
  public constructor(
    private readonly infoToSend: Array<string>,
    private readonly streamRequests: Array<(steram: MediaStream) => AppMsg>,
    private readonly eventListeners: Array<(event: ListenEvent) => AppMsg>
  ) {}

  public registerStream(): NewRoom<AppMsg> {
    return this
  }

  public registerSession(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    userAgent: UA,
    options: ConnectionOptions
  ): NewRoom<AppMsg> {
    const key = options.key
    const [fakeVideoStream, stopFakeStream] = makeFakeVideoStream()

    const session = userAgent.call(options.uri, {
      mediaConstraints: {
        audio: false,
        video: false
      },
      mediaStream: fakeVideoStream,
      pcConfig: {
        rtcpMuxPolicy: 'negotiate',
        iceServers: options.iceServers
      }
    })

    const onFailed: EndListener = event => {
      router.sendToSelf(new FailSession(key, event.cause))
    }

    const onEnded: EndListener = () => {
      router.sendToSelf(new EndSession(key))
    }

    const onConfirmed: CallListener = () => {
      router.sendToSelf(new RegisterStream(key))
    }

    const stopSessionListeners = (): void => {
      session
        .off('failed', onFailed)
        .off('ended', onEnded)
        .off('confirmed', onConfirmed)
    }

    session
      .on('failed', onFailed)
      .on('ended', onEnded)
      .on('confirmed', onConfirmed)

    return new RegistringRoom(
      userAgent,
      session,
      [stopFakeStream, stopSessionListeners],
      this.eventListeners,
      this.infoToSend,
      this.streamRequests
    )
  }

  public dispatchStream(
    tagger: (stream: MediaStream) => AppMsg
  ): NewRoom<AppMsg> {
    return new EmptyRoom(
      this.infoToSend,
      [...this.streamRequests, tagger],
      this.eventListeners
    )
  }

  public dispatchInfo(info: string): NewRoom<AppMsg> {
    return new EmptyRoom(
      [...this.infoToSend, info],
      this.streamRequests,
      this.eventListeners
    )
  }

  public pushListener(
    listener: (event: ListenEvent) => AppMsg
  ): NewRoom<AppMsg> {
    return new EmptyRoom(this.infoToSend, this.streamRequests, [
      ...this.eventListeners,
      listener
    ])
  }

  public clearListeners(): NewRoom<AppMsg> {
    return new EmptyRoom(this.infoToSend, this.streamRequests, [])
  }

  public dispatchEvent(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    event: ListenEvent
  ): void {
    for (const listener of this.eventListeners) {
      router.sendToApp(listener(event))
    }
  }

  // eslint-disable-next-line class-methods-use-this
  public close(): void {
    // do nothing
  }
}

class OpenedRoom<AppMsg> implements NewRoom<AppMsg> {
  public constructor(
    protected readonly userAgent: UA,
    protected readonly session: RTCSession,
    protected readonly cleanups: Array<VoidFunction>,
    protected readonly eventListeners: Array<(event: ListenEvent) => AppMsg>
  ) {}

  public registerSession(): NewRoom<AppMsg> {
    return this
  }

  public registerStream(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>
  ): NewRoom<AppMsg> {
    return this
  }

  public dispatchStream(
    tagger: (stream: MediaStream) => AppMsg
  ): NewRoom<AppMsg> {
    const streams = this.session.connection.getRemoteStreams()

    if (streams.length > 0) {
      tagger(streams[0])
    }

    return this
  }

  public dispatchEvent(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    event: ListenEvent
  ): void {
    for (const listener of this.eventListeners) {
      router.sendToApp(listener(event))
    }
  }

  public dispatchInfo(info: string): NewRoom<AppMsg> {
    this.session.sendInfo('text/plain', info)

    return this
  }

  public pushListener(
    listener: (event: ListenEvent) => AppMsg
  ): NewRoom<AppMsg> {
    return new OpenedRoom(this.userAgent, this.session, this.cleanups, [
      ...this.eventListeners,
      listener
    ])
  }

  public clearListeners(): NewRoom<AppMsg> {
    return new OpenedRoom(this.userAgent, this.session, this.cleanups, [])
  }

  public close(): void {
    if (this.session.isEstablished()) {
      this.session.terminate()
    }

    if (this.userAgent.isConnected()) {
      this.userAgent.stop()
    }

    for (const cleanup of this.cleanups) {
      cleanup()
    }
  }
}

class RegistringRoom<AppMsg> extends OpenedRoom<AppMsg> {
  public constructor(
    userAgent: UA,
    session: RTCSession,
    cleanups: Array<VoidFunction>,
    eventListeners: Array<(event: ListenEvent) => AppMsg>,
    private readonly infoToSend: Array<string>,
    private readonly streamRequests: Array<(steram: MediaStream) => AppMsg>
  ) {
    super(userAgent, session, cleanups, eventListeners)
  }

  public registerStream(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>
  ): NewRoom<AppMsg> {
    const streams = this.session.connection.getRemoteStreams()

    if (streams.length > 0) {
      for (const letter of this.streamRequests) {
        router.sendToApp(letter(streams[0]))
      }
    }

    for (const info of this.infoToSend) {
      this.session.sendInfo('text/plain', info)
    }

    return new OpenedRoom(
      this.userAgent,
      this.session,
      this.cleanups,
      this.eventListeners
    )
  }

  public dispatchStream(
    tagger: (stream: MediaStream) => AppMsg
  ): NewRoom<AppMsg> {
    return new EmptyRoom(
      this.infoToSend,
      [...this.streamRequests, tagger],
      this.eventListeners
    )
  }

  public dispatchInfo(info: string): NewRoom<AppMsg> {
    return new EmptyRoom(
      [...this.infoToSend, info],
      this.streamRequests,
      this.eventListeners
    )
  }
}

interface CanvasElement extends HTMLCanvasElement {
  captureStream(frameRate?: number): MediaStream
}

const makeFakeVideoStream = (): [MediaStream, VoidFunction] => {
  const canvas = document.createElement('canvas') as CanvasElement
  canvas.width = 1
  canvas.height = 1
  canvas.getContext('2d')?.fillRect(0, 0, 1, 1)

  return [
    canvas.captureStream(1), // 1 FPS
    () => canvas.remove()
  ]
}

type State<AppMsg> = Record<string, undefined | NewRoom<AppMsg>>

interface SipSelfMsg<AppMsg> {
  proceed(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    state: State<AppMsg>
  ): State<AppMsg>
}

class RegisterSession<AppMsg> implements SipSelfMsg<AppMsg> {
  public constructor(
    private readonly userAgent: UA,
    private readonly options: ConnectionOptions
  ) {}

  public proceed(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    state: State<AppMsg>
  ): State<AppMsg> {
    const key = this.options.key
    const room = state[key]

    if (room == null) {
      return state
    }

    return {
      ...state,
      [key]: room.registerSession(router, this.userAgent, this.options)
    }
  }
}

class RegisterStream<AppMsg> implements SipSelfMsg<AppMsg> {
  public constructor(private readonly key: string) {}

  public proceed(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    state: State<never>
  ): State<never> {
    const room = state[this.key]

    if (room == null) {
      return state
    }

    return {
      ...state,
      [this.key]: room.registerStream(router)
    }
  }
}

class FailSession<AppMsg> implements SipSelfMsg<AppMsg> {
  public constructor(
    private readonly key: string,
    private readonly reason: string
  ) {}

  public proceed(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    state: State<never>
  ): State<never> {
    const room = state[this.key]

    if (room == null) {
      return state
    }

    room.dispatchEvent(router, OnFailure(this.reason))

    return state
  }
}

class EndSession<AppMsg> implements SipSelfMsg<AppMsg> {
  public constructor(private readonly key: string) {}

  public proceed(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    state: State<AppMsg>
  ): State<AppMsg> {
    const room = state[this.key]

    if (room == null) {
      return state
    }

    room.dispatchEvent(router, OnEnd)

    return state
  }
}

interface SipCmd<AppMsg> extends Functor<AppMsg> {
  execute(state: State<AppMsg>): State<AppMsg>
}

class GetStreamCmd<AppMsg> implements SipCmd<AppMsg> {
  public constructor(
    private readonly key: string,
    private readonly tagger: (stream: MediaStream) => AppMsg
  ) {}

  public map<R>(fn: (msg: AppMsg) => R): SipCmd<R> {
    return new GetStreamCmd(this.key, stream => fn(this.tagger(stream)))
  }

  public execute(state: State<AppMsg>): State<AppMsg> {
    const room = state[this.key]

    if (room == null) {
      return {
        ...state,
        [this.key]: new EmptyRoom([], [this.tagger], [])
      }
    }

    return {
      ...state,
      [this.key]: room.dispatchStream(this.tagger)
    }
  }
}

class SendInfoCmd implements SipCmd<never> {
  public constructor(
    private readonly key: string,
    private readonly info: string
  ) {}

  public map(): SipCmd<never> {
    return this
  }

  public execute(state: State<never>): State<never> {
    const room = state[this.key]

    if (room == null) {
      return {
        ...state,
        [this.key]: new EmptyRoom([this.info], [], [])
      }
    }

    return {
      ...state,
      [this.key]: room.dispatchInfo(this.info)
    }
  }
}

class TerminateCmd implements SipCmd<never> {
  public constructor(private readonly key: string) {}

  public map(): SipCmd<never> {
    return this
  }

  public execute(state: State<never>): State<never> {
    state[this.key]?.close()

    return state
  }
}

interface SipSub<AppMsg> extends Functor<AppMsg> {
  register(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    prevState: State<AppMsg>,
    nextState: State<AppMsg>
  ): void
}

class ListenSub<AppMsg> implements SipSub<AppMsg> {
  public constructor(
    private readonly options: ConnectionOptions,
    private readonly onEvent: (event: ListenEvent) => AppMsg
  ) {}

  public map<R>(fn: (msg: AppMsg) => R): SipSub<R> {
    return new ListenSub(this.options, event => fn(this.onEvent(event)))
  }

  public register(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    prevState: State<AppMsg>,
    nextState: State<AppMsg>
  ): void {
    const key = this.options.key

    const newRoom = nextState[key]

    // the room has been defined in the current register tick
    if (newRoom != null) {
      nextState[key] = newRoom.pushListener(this.onEvent)

      return
    }

    const oldRoom = prevState[key]

    if (oldRoom != null) {
      nextState[key] = oldRoom.clearListeners().pushListener(this.onEvent)

      return
    }

    let ws: null | WebSocketInterface = null

    try {
      ws = new WebSocketInterface(this.options.webSocketUrl)
    } catch (error) {
      router.sendToSelf(
        new FailSession(
          key,
          error?.message ?? 'WebSocketInterface initialisation failed'
        )
      )

      nextState[key] = new EmptyRoom([], [], [this.onEvent])

      return
    }

    let ua: null | UA = null

    try {
      ua = new UA({
        uri: this.options.uri,
        sockets: ws,
        display_name: this.options.client,
        register: true
      })
    } catch (error) {
      router.sendToSelf(
        new FailSession(
          key,
          error?.message ?? 'UserAgent initialisation failed'
        )
      )

      nextState[key] = new EmptyRoom([], [], [this.onEvent])

      return
    }

    ua.once('registrationFailed', ({ response }) => {
      router.sendToSelf(new FailSession(key, response.reason_phrase))
    })

    ua.once('registered', () => {
      try {
        if (ua) {
          router.sendToSelf(new RegisterSession(ua, this.options))
        }
      } catch (error) {
        router.sendToSelf(
          new FailSession(key, error?.message ?? 'Unknown error')
        )
      }
    })

    ua.start()

    nextState[key] = new EmptyRoom([], [], [this.onEvent])
  }
}

const sipManager = registerManager<
  unknown,
  SipSelfMsg<unknown>,
  State<unknown>,
  SipCmd<unknown>,
  SipSub<unknown>
>({
  init() {
    return {}
  },

  onEffects(router, cmds, subs, prevState) {
    let nextState: State<unknown> = {}

    for (const sub of subs) {
      sub.register(router, prevState, nextState)
    }

    for (const key of Object.keys(prevState)) {
      if (!(key in nextState)) {
        prevState[key]?.close()
      }
    }

    for (const cmd of cmds) {
      nextState = cmd.execute(nextState)
    }

    return nextState
  },

  onSelfMsg(router, msg, state) {
    return msg.proceed(router, state)
  }
})

export type ListenEvent = CaseOf<'OnFailure', string> | CaseOf<'OnEnd'>

const OnFailure: CaseCreator<ListenEvent> = CaseOf('OnFailure')
const OnEnd: ListenEvent = CaseOf('OnEnd')()

export interface Connection {
  getStream<T>(tagger: (stream: MediaStream) => T): Cmd<T>
  sendInfo(info: string): Cmd<never>
  terminate: Cmd<never>
  listen<T>(onEvent: (event: ListenEvent) => T): Sub<T>

  //
  // onEnd<T>(msg: T): Sub<T>
  // onFail<T>(tagger: (reason: string) => T): Sub<T>
  // onIncomingInfo<T>(tagger: (content: string) => T): Sub<T>
  // onOutgoingInfo<T>(tagger: (content: string) => T): Sub<T>
}

// eslint-disable-next-line no-shadow
enum WebSocketProtocol {
  WS = 'ws',
  WSS = 'wss'
}

export interface CreateConnectionOptions {
  secure?: boolean
  server: string
  agent: string
  client: string
  iceServers: Array<string>
}

class ConnectionOptions {
  private static compare(left: string, right: string): number {
    if (left < right) {
      return -1
    }

    if (left > right) {
      return 1
    }

    return 0
  }

  private static extractHost(server: string): string {
    return server.replace(/(^sips?:|:\d+$)/g, '')
  }

  private static extractPort(server: string): string | null {
    return server.replace(/^.+:/, '') || null
  }

  private static urlToIceServer(url: string): RTCIceServer {
    return /^turns?:/.test(url)
      ? {
          urls: url,
          username: 'turn',
          credential: 'turn'
        }
      : { urls: url }
  }

  public static create(options: CreateConnectionOptions): ConnectionOptions {
    return new ConnectionOptions(
      options.secure ? WebSocketProtocol.WSS : WebSocketProtocol.WS,
      ConnectionOptions.extractHost(options.server),
      ConnectionOptions.extractPort(options.server),
      options.agent,
      options.client,
      options.iceServers.slice().sort(ConnectionOptions.compare)
    )
  }

  private constructor(
    private readonly protocol: WebSocketProtocol,
    private readonly host: string,
    private readonly port: null | string,
    private readonly agent: string,
    public readonly client: string,
    private readonly servers: Array<string>
  ) {}

  private withPort(path: string): string {
    if (this.port == null) {
      return path
    }

    return `${path}:${this.port}`
  }

  public get webSocketUrl(): string {
    return this.withPort(`${this.protocol}://${this.host}`)
  }

  public get uri(): string {
    return this.withPort(`${this.agent}@${this.host}`)
  }

  public get key(): string {
    return [
      this.protocol,
      this.host,
      this.port,
      this.agent,
      this.client,
      this.servers.join(',')
    ].join('|')
  }

  public get iceServers(): Array<RTCIceServer> {
    return this.servers.map(ConnectionOptions.urlToIceServer)
  }
}

class ConnectionImpl implements Connection {
  public constructor(private readonly options: ConnectionOptions) {}

  public getStream<T>(tagger: (stream: MediaStream) => T): Cmd<T> {
    return sipManager.createCmd(new GetStreamCmd(this.options.key, tagger))
  }

  public sendInfo(info: string): Cmd<never> {
    return sipManager.createCmd(new SendInfoCmd(this.options.key, info))
  }

  public get terminate(): Cmd<never> {
    return sipManager.createCmd(new TerminateCmd(this.options.key))
  }

  public listen<T>(onEvent: (event: ListenEvent) => T): Sub<T> {
    return sipManager.createSub(new ListenSub(this.options, onEvent))
  }
}

export const createConnection = (
  options: CreateConnectionOptions
): Connection => {
  const connectionOptions = ConnectionOptions.create(options)

  return new ConnectionImpl(connectionOptions)
}
