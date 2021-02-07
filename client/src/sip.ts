import { WebSocketInterface, UA } from 'jssip/lib/JsSIP'
import { RTCSession } from 'jssip/lib/RTCSession'
import { debug } from 'jssip/lib/JsSIP'
import { Functor, Router, Cmd, Sub, registerManager } from 'core'
import { CaseOf, CaseCreator } from 'utils'

debug.enable('JsSIP:*')

// eslint-disable-next-line no-shadow
enum WebSocketProtocol {
  WS = 'ws',
  WSS = 'wss'
}

const buildWebSocketUrl = (
  protocol: WebSocketProtocol,
  host: string,
  port: null | string
): string => {
  const url = `${protocol}://${host}`

  if (port == null) {
    return url
  }

  return `${url}:${port}`
}

const extractHost = (server: string): string => {
  return server.replace(/(^sips:|:\d+$)/g, '')
}

const extractPort = (server: string): string | null => {
  return server.replace(/^.+:/, '') || null
}

const buildUri = (
  username: string,
  host: string,
  port: null | string
): string => {
  const uri = `${username}@${host}`

  if (port === null) {
    return uri
  }

  return `${uri}:${port}`
}

const compare = <T extends string | number>(left: T, right: T): number => {
  if (left < right) {
    return -1
  }

  if (left > right) {
    return 1
  }

  return 0
}

const generateKey = (options: ConnectionOptions): string => {
  return [
    options.protocol,
    options.host,
    options.port,
    options.agent,
    options.client,
    options.iceServers.sort(compare)
  ].join('|')
}

type Listeners<AppMsg> = Array<(event: ListenEvent) => AppMsg>

interface Room<AppMsg> {
  ua: null | UA
  session: null | RTCSession
  stopFakeStream: null | VoidFunction
  infoToSend: Array<string>
  streamListeners: Array<(stream: MediaStream) => AppMsg>
  eventListeners: Array<(event: ListenEvent) => AppMsg>
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

const closeRoom = <AppMsg>(room: Room<AppMsg>): void => {
  if (room.session?.isEstablished()) {
    room.session.terminate()
  }

  if (room.ua?.isConnected()) {
    room.ua.stop()
  }

  room.stopFakeStream?.()
}

type State<AppMsg> = Record<string, undefined | Room<AppMsg>>

interface SipSelfMsg<AppMsg> {
  proceed(
    sendToApp: (msgs: Array<AppMsg>) => void,
    state: State<AppMsg>
  ): State<AppMsg>
}

class RegisterSession<AppMsg> implements SipSelfMsg<AppMsg> {
  public constructor(
    private readonly key: string,
    private readonly session: RTCSession,
    private readonly stopFakeStream: VoidFunction
  ) {}

  public proceed(
    sendToApp: (msgs: Array<AppMsg>) => void,
    state: State<AppMsg>
  ): State<AppMsg> {
    const room = state[this.key]

    if (room == null) {
      return state
    }

    const streams = this.session.connection.getRemoteStreams()

    if (streams.length > 0) {
      sendToApp(room.streamListeners.map(letter => letter(streams[0])))
    }

    for (const info of room.infoToSend) {
      room.session?.sendInfo('text/plain', info)
    }

    return {
      ...state,
      [this.key]: {
        ...room,
        streamListeners: [],
        session: this.session,
        stopFakeStream: this.stopFakeStream
      }
    }
  }
}

class FailSession implements SipSelfMsg<never> {
  public constructor(
    private readonly key: string,
    private readonly reason: string
  ) {}

  public proceed(
    sendToApp: (msgs: Array<never>) => void,
    state: State<never>
  ): State<never> {
    const room = state[this.key]

    if (room == null) {
      return state
    }

    sendToApp(room.eventListeners.map(letter => letter(OnFailure(this.reason))))
    closeRoom(room)

    return state
  }
}

class EndSession<AppMsg> implements SipSelfMsg<AppMsg> {
  public constructor(private readonly key: string) {}

  public proceed(
    sendToApp: (msgs: Array<AppMsg>) => void,
    state: State<AppMsg>
  ): State<AppMsg> {
    const room = state[this.key]

    if (room == null) {
      return state
    }

    sendToApp(room.eventListeners.map(letter => letter(OnEnd)))
    closeRoom(room)

    const { [this.key]: _, ...nextState } = state

    return nextState
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
        [this.key]: {
          ua: null,
          session: null,
          stopFakeStream: null,
          infoToSend: [],
          eventListeners: [],
          streamListeners: [this.tagger]
        }
      }
    }

    const streams = room.session?.connection.getRemoteStreams() ?? []

    if (streams.length > 0) {
      this.tagger(streams[0])

      return state
    }

    return {
      ...state,
      [this.key]: {
        ...room,
        streamListeners: [...room.streamListeners, this.tagger]
      }
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
        [this.key]: {
          ua: null,
          session: null,
          stopFakeStream: null,
          infoToSend: [this.info],
          eventListeners: [],
          streamListeners: []
        }
      }
    }

    if (room.session != null) {
      room.session.sendInfo('text/plain', this.info)

      return state
    }

    return {
      ...state,
      [this.key]: {
        ...room,
        infoToSend: [...room.infoToSend, this.info]
      }
    }
  }
}

interface SipSub<AppMsg> extends Functor<AppMsg> {
  register(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    prevState: State<AppMsg>,
    nextState: State<AppMsg>
  ): void
}

const pushListeners = <AppMsg>(
  onEvent: (event: ListenEvent) => AppMsg,
  listeners: Listeners<AppMsg> = []
): Listeners<AppMsg> => {
  listeners.push(onEvent)

  return listeners
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
    const key = generateKey(this.options)

    const newRoom = nextState[key]

    // the room has been defined in the current register tick
    if (newRoom != null) {
      newRoom.eventListeners = pushListeners(
        this.onEvent,
        newRoom.eventListeners
      )

      return
    }

    const oldRoom = prevState[key]

    if (oldRoom != null) {
      nextState[key] = {
        ...oldRoom,
        eventListeners: pushListeners(this.onEvent)
      }

      return
    }

    const webSocketUrl = buildWebSocketUrl(
      this.options.protocol,
      this.options.host,
      this.options.port
    )

    let ws: null | WebSocketInterface = null

    try {
      ws = new WebSocketInterface(webSocketUrl)
    } catch (error) {
      router.sendToSelf(
        new FailSession(
          key,
          error?.message ?? 'WebSocketInterface initialisation failed'
        )
      )

      nextState[key] = {
        ua: null,
        session: null,
        stopFakeStream: null,
        infoToSend: [],
        eventListeners: pushListeners(this.onEvent),
        streamListeners: []
      }

      return
    }

    let ua: null | UA = null

    try {
      ua = new UA({
        uri: buildUri(
          this.options.client,
          this.options.host,
          this.options.port
        ),
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

      nextState[key] = {
        ua: null,
        session: null,
        stopFakeStream: null,
        infoToSend: [],
        eventListeners: pushListeners(this.onEvent),
        streamListeners: []
      }

      return
    }

    ua.on('registrationFailed', ({ response }) => {
      router.sendToSelf(new FailSession(key, response.reason_phrase))
    })

    ua.on('registered', () => {
      try {
        const [fakeVideoStream, stopFakeStream] = makeFakeVideoStream()
        const session = ua?.call(
          buildUri(this.options.agent, this.options.host, this.options.port),
          {
            mediaConstraints: {
              audio: false,
              video: false
            },
            mediaStream: fakeVideoStream,
            pcConfig: {
              rtcpMuxPolicy: 'negotiate',
              iceServers: this.options.iceServers.map(url => {
                return /^turns?:/.test(url)
                  ? {
                      urls: url,
                      username: 'turn',
                      credential: 'turn'
                    }
                  : { urls: url }
              })
            }
          }
        )

        session?.on('failed', event => {
          router.sendToSelf(new FailSession(key, event.cause))
        })

        session?.on('ended', () => {
          router.sendToSelf(new EndSession(key))
        })

        session?.on('confirmed', () => {
          router.sendToSelf(new RegisterSession(key, session, stopFakeStream))
        })
      } catch (error) {
        router.sendToSelf(
          new FailSession(key, error?.message ?? 'Unknown error')
        )
      }
    })

    ua.start()

    nextState[key] = {
      ua,
      session: null,
      stopFakeStream: null,
      infoToSend: [],
      eventListeners: pushListeners(this.onEvent),
      streamListeners: []
    }
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

    for (const key in prevState) {
      if (!(key in nextState)) {
        const room = prevState[key]

        room && closeRoom(room)
      }
    }

    for (const cmd of cmds) {
      nextState = cmd.execute(nextState)
    }

    return nextState
  },

  onSelfMsg(sendToApp, msg, state) {
    return msg.proceed(sendToApp, state)
  }
})

export type ListenEvent = CaseOf<'OnFailure', string> | CaseOf<'OnEnd'>

const OnFailure: CaseCreator<ListenEvent> = CaseOf('OnFailure')
const OnEnd: ListenEvent = CaseOf('OnEnd')()

export interface Connection {
  getStream<T>(tagger: (stream: MediaStream) => T): Cmd<T>
  sendInfo(info: string): Cmd<never>
  listen<T>(onEvent: (event: ListenEvent) => T): Sub<T>
}

interface ConnectionOptions {
  protocol: WebSocketProtocol
  host: string
  port: null | string
  agent: string
  client: string
  iceServers: Array<string>
}
class ConnectionImpl implements Connection {
  public constructor(private readonly options: ConnectionOptions) {}

  private get key(): string {
    return generateKey(this.options)
  }

  public getStream<T>(tagger: (stream: MediaStream) => T): Cmd<T> {
    return sipManager.createCmd(new GetStreamCmd(this.key, tagger))
  }

  public sendInfo(info: string): Cmd<never> {
    return sipManager.createCmd(new SendInfoCmd(this.key, info))
  }

  public listen<T>(onEvent: (event: ListenEvent) => T): Sub<T> {
    return sipManager.createSub(new ListenSub(this.options, onEvent))
  }
}

export const createConnection = (options: {
  secure: boolean
  server: string
  agent: string
  client: string
  iceServers: Array<string>
}): Connection => {
  return new ConnectionImpl({
    protocol: options.secure ? WebSocketProtocol.WSS : WebSocketProtocol.WS,
    host: extractHost(options.server),
    port: extractPort(options.server),
    agent: options.agent,
    client: options.client,
    iceServers: options.iceServers
  })
}
