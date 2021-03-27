import { WebSocketInterface, UA } from 'jssip/lib/JsSIP'
import { CallListener, EndListener, RTCSession } from 'jssip/lib/RTCSession'
import { debug } from 'jssip/lib/JsSIP'
import { Functor, Router, Cmd, Sub, registerManager } from 'core'
import { Schema, CaseOf, CaseCreator, match } from 'utils'

debug.enable('JsSIP:*')

class Room<AppMsg> {
  public static init<T>({
    pendingInfoToSend = [],
    streamRequests = [],
    eventListeners = []
  }: {
    pendingInfoToSend?: Array<string>
    streamRequests?: Array<(steram: MediaStream) => T>
    eventListeners?: Array<(event: ListenEvent) => null | T>
  } = {}): Room<T> {
    return new Room(
      null,
      null,
      [],
      pendingInfoToSend,
      streamRequests,
      eventListeners
    )
  }

  private constructor(
    private readonly userAgent: null | UA,
    private readonly session: null | RTCSession,
    private readonly cleanups: Array<VoidFunction>,
    private readonly pendingSendInfo: Array<string>,
    private readonly pendingStreamRequests: Array<
      (steram: MediaStream) => AppMsg
    >,
    private readonly eventListeners: Array<
      (event: ListenEvent) => null | AppMsg
    >
  ) {}

  public clone({
    userAgent = this.userAgent,
    session = this.session,
    pendingInfoToSend = this.pendingSendInfo,
    cleanups = this.cleanups,
    pendingStreamRequests = this.pendingStreamRequests,
    eventListeners = this.eventListeners
  }: {
    userAgent?: null | UA
    session?: null | RTCSession
    cleanups?: Array<VoidFunction>
    pendingInfoToSend?: Array<string>
    pendingStreamRequests?: Array<(steram: MediaStream) => AppMsg>
    eventListeners?: Array<(event: ListenEvent) => null | AppMsg>
  }): Room<AppMsg> {
    return new Room(
      userAgent,
      session,
      cleanups,
      pendingInfoToSend,
      pendingStreamRequests,
      eventListeners
    )
  }

  private registerSessionDanger(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    options: ConnectionOptions,
    userAgent: UA
  ): Room<AppMsg> {
    const key = options.key
    const [fakeVideoStream, stopFakeStream] = makeFakeVideoStream()

    const session = userAgent.call(options.agentUri, {
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

    return this.clone({
      userAgent,
      session,
      cleanups: [stopFakeStream, stopSessionListeners]
    })
  }

  public registerSession(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    options: ConnectionOptions,
    userAgent: UA
  ): Room<AppMsg> {
    if (this.session != null) {
      return this
    }

    try {
      return this.registerSessionDanger(router, options, userAgent)
    } catch (error) {
      router.sendToSelf(
        new FailSession(options.key, error?.message ?? 'Unknown error')
      )

      return this
    }
  }

  public registerStream(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>
  ): Room<AppMsg> {
    if (this.session == null) {
      return this
    }

    const streams = this.session.connection.getRemoteStreams()

    if (streams.length > 0) {
      for (const letter of this.pendingStreamRequests) {
        router.sendToApp(letter(streams[0]))
      }
    }

    for (const info of this.pendingSendInfo) {
      this.session.sendInfo('text/plain', info)
    }

    return this.clone({
      pendingInfoToSend: [],
      pendingStreamRequests: []
    })
  }

  public pushListener(
    eventListener: (event: ListenEvent) => null | AppMsg
  ): Room<AppMsg> {
    return this.clone({
      eventListeners: [...this.eventListeners, eventListener]
    })
  }

  public close(): void {
    if (this.session?.isEstablished()) {
      this.session.terminate()
    }

    if (this.userAgent?.isConnected()) {
      this.userAgent.stop()
    }

    for (const cleanup of this.cleanups) {
      cleanup()
    }
  }

  public sendInfo(info: string): Room<AppMsg> {
    if (this.session == null) {
      return this.clone({
        pendingInfoToSend: [...this.pendingSendInfo, info]
      })
    }

    this.session.sendInfo('text/plain', info)

    return this
  }

  public dispatchStream(tagger: (stream: MediaStream) => AppMsg): Room<AppMsg> {
    if (this.session == null) {
      return this.clone({
        pendingStreamRequests: [...this.pendingStreamRequests, tagger]
      })
    }

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
      const msg = listener(event)

      if (msg !== null) {
        router.sendToApp(msg)
      }
    }
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

type State<AppMsg> = Record<string, undefined | Room<AppMsg>>

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
      [key]: room.registerSession(router, this.options, this.userAgent)
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
        [this.key]: Room.init({
          streamRequests: [this.tagger]
        })
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
        [this.key]: Room.init({
          pendingInfoToSend: [this.info]
        })
      }
    }

    return {
      ...state,
      [this.key]: room.sendInfo(this.info)
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
  private static startUserAgent<T>(
    router: Router<T, SipSelfMsg<T>>,
    options: ConnectionOptions,
    ws: WebSocketInterface
  ): void {
    const ua = new UA({
      uri: options.clientUri,
      sockets: ws,
      display_name: options.client,
      register: true
    })

    ua.once('registrationFailed', ({ response }) => {
      router.sendToSelf(new FailSession(options.key, response.reason_phrase))
    })

    ua.once('registered', () => {
      router.sendToSelf(new RegisterSession(ua, options))
    })

    ua.start()
  }

  public constructor(
    private readonly options: ConnectionOptions,
    private readonly onEvent: (event: ListenEvent) => null | AppMsg
  ) {}

  public map<R>(fn: (msg: AppMsg) => R): SipSub<R> {
    return new ListenSub(this.options, event => {
      const msg = this.onEvent(event)

      return msg === null ? null : fn(msg)
    })
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
      nextState[key] = oldRoom.clone({
        eventListeners: [this.onEvent]
      })

      return
    }

    try {
      const ws = new WebSocketInterface(this.options.webSocketUrl)

      try {
        ListenSub.startUserAgent(router, this.options, ws)
      } catch (error) {
        router.sendToSelf(
          new FailSession(
            key,
            error?.message ?? 'UserAgent initialisation failed'
          )
        )
      }
    } catch (error) {
      router.sendToSelf(
        new FailSession(
          key,
          error?.message ?? 'WebSocketInterface initialisation failed'
        )
      )
    }

    nextState[key] = Room.init({
      eventListeners: [this.onEvent]
    })
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

  // TODO no need when BE returns valid url
  private static sanitazeIceServer(url: string): string {
    return url
      .replace(/^stun:\/+/, 'stun:')
      .replace(/^stuns:\/+/, 'stuns:')
      .replace(/^turn:\/+/, 'turn:')
      .replace(/^turns:\/+/, 'turns:')
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
      options.iceServers
        .map(ConnectionOptions.sanitazeIceServer)
        .sort(ConnectionOptions.compare)
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

  private getUriFor(username: string): string {
    return this.withPort(`${username}@${this.host}`)
  }

  private withPort(path: string): string {
    if (this.port == null) {
      return path
    }

    return `${path}:${this.port}`
  }

  public get webSocketUrl(): string {
    return this.withPort(`${this.protocol}://${this.host}`)
  }

  public get clientUri(): string {
    return this.getUriFor(this.client)
  }

  public get agentUri(): string {
    return this.getUriFor(this.agent)
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

export interface Connection {
  getStream<T>(tagger: (stream: MediaStream) => T): Cmd<T>
  sendInfo(info: string): Cmd<never>
  terminate: Cmd<never>

  onEnd<T>(msg: T): Sub<T>
  onFailure<T>(tagger: (reason: string) => T): Sub<T>
  // onIncomingInfo<T>(tagger: (content: string) => T): Sub<T>
  // onOutgoingInfo<T>(tagger: (content: string) => T): Sub<T>
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

  private listen<T>(schema: Schema<ListenEvent, null | T>): Sub<T> {
    return sipManager.createSub(
      new ListenSub(this.options, event => {
        return match<ListenEvent, null | T>(event, schema)
      })
    )
  }

  public onEnd<T>(msg: T): Sub<T> {
    return this.listen({
      OnEnd: () => msg,
      _: () => null
    })
  }

  public onFailure<T>(tagger: (reason: string) => T): Sub<T> {
    return this.listen({
      OnFailure: tagger,
      _: () => null
    })
  }
}

export const createConnection = (
  options: CreateConnectionOptions
): Connection => {
  const connectionOptions = ConnectionOptions.create(options)

  return new ConnectionImpl(connectionOptions)
}
