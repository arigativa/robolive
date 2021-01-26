import { WebSocketInterface, UA } from 'jssip/lib/JsSIP'
import { RTCSession } from 'jssip/lib/RTCSession'
import { debug } from 'jssip/lib/JsSIP'
import { Functor, Router, Sub, registerManager } from 'core'
import { CaseOf, CaseCreator, match } from 'utils'

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

const generateKey = (options: RegisterOptions): string => {
  return [
    options.protocol,
    options.host,
    options.port,
    options.agent,
    options.client,
    options.iceServers.sort(compare)
  ].join('|')
}

interface Listeners<AppMsg> {
  onFailure: Array<(reason: string) => AppMsg>
  onTerminate: Array<AppMsg>
  onConnect: Array<(stream: MediaStream) => AppMsg>
}

interface Room<AppMsg> {
  ua: null | UA
  session: null | RTCSession
  stopFakeStream: null | VoidFunction
  listeners: Listeners<AppMsg>
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

type CallEvent =
  | CaseOf<'Failure', string>
  | CaseOf<'Connect', MediaStream>
  | CaseOf<'Terminate'>

const Failure: CaseCreator<CallEvent> = CaseOf('Failure')
const Connect: CaseCreator<CallEvent> = CaseOf('Connect')
const Terminate: CallEvent = CaseOf('Terminate')()

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
      sendToApp(room.listeners.onConnect.map(letter => letter(streams[0])))
    }

    return {
      ...state,
      [this.key]: {
        ...room,
        session: this.session,
        stopFakeStream: this.stopFakeStream
      }
    }
  }
}

class StopUserAgent implements SipSelfMsg<never> {
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

    sendToApp(room.listeners.onFailure.map(letter => letter(this.reason)))
    closeRoom(room)

    return state
  }
}

class TerminateSession<AppMsg> implements SipSelfMsg<AppMsg> {
  public constructor(private readonly key: string) {}

  public proceed(
    sendToApp: (msgs: Array<AppMsg>) => void,
    state: State<AppMsg>
  ): State<AppMsg> {
    const room = state[this.key]

    if (room == null) {
      return state
    }

    sendToApp(room.listeners.onTerminate)
    closeRoom(room)

    const { [this.key]: _, ...nextState } = state

    return nextState
  }
}

interface SipSub<AppMsg> extends Functor<AppMsg> {
  register(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    prevState: State<AppMsg>,
    nextState: State<AppMsg>
  ): void
}

interface RegisterOptions {
  protocol: WebSocketProtocol
  host: string
  port: null | string
  agent: string
  client: string
  iceServers: Array<string>
}

const pushListeners = <AppMsg>(
  onEvent: (event: CallEvent) => AppMsg,
  listeners: Listeners<AppMsg> = {
    onConnect: [],
    onFailure: [],
    onTerminate: []
  }
): Listeners<AppMsg> => {
  listeners.onConnect.push(stream => onEvent(Connect(stream)))
  listeners.onFailure.push(reason => onEvent(Failure(reason)))
  listeners.onTerminate.push(onEvent(Terminate))

  return listeners
}

class Call<AppMsg> implements SipSub<AppMsg> {
  public constructor(
    private readonly options: RegisterOptions,
    private readonly onEvent: (event: CallEvent) => AppMsg
  ) {}

  public map<R>(fn: (msg: AppMsg) => R): SipSub<R> {
    return new Call(this.options, event => fn(this.onEvent(event)))
  }

  public register(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    prevState: State<AppMsg>,
    nextState: State<AppMsg>
  ): void {
    const key = generateKey(this.options)

    const newRoom = nextState[key]

    if (newRoom != null) {
      newRoom.listeners = pushListeners(this.onEvent, newRoom.listeners)

      return
    }

    const oldRoom = prevState[key]

    if (oldRoom != null) {
      nextState[key] = {
        ...oldRoom,
        listeners: pushListeners(this.onEvent)
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
        new StopUserAgent(
          key,
          error?.message ?? 'WebSocketInterface initialisation failed'
        )
      )

      nextState[key] = {
        ua: null,
        session: null,
        stopFakeStream: null,
        listeners: pushListeners(this.onEvent)
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
        new StopUserAgent(
          key,
          error?.message ?? 'UserAgent initialisation failed'
        )
      )

      nextState[key] = {
        ua: null,
        session: null,
        stopFakeStream: null,
        listeners: pushListeners(this.onEvent)
      }

      return
    }

    ua.on('registrationFailed', ({ response }) => {
      router.sendToSelf(new StopUserAgent(key, response.reason_phrase))
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
          router.sendToSelf(new StopUserAgent(key, event.cause))
        })

        session?.on('ended', () => {
          router.sendToSelf(new TerminateSession(key))
        })

        session?.on('confirmed', () => {
          router.sendToSelf(new RegisterSession(key, session, stopFakeStream))
        })
      } catch (error) {
        router.sendToSelf(
          new StopUserAgent(key, error?.message ?? 'Unknown error')
        )
      }
    })

    ua.start()

    nextState[key] = {
      ua,
      session: null,
      stopFakeStream: null,
      listeners: pushListeners(this.onEvent)
    }
  }
}

const sipManager = registerManager<
  unknown,
  SipSelfMsg<unknown>,
  State<unknown>,
  never,
  SipSub<unknown>
>({
  init() {
    return {}
  },

  onEffects(router, cmds, subs, prevState) {
    const nextState: State<unknown> = {}

    for (const sub of subs) {
      sub.register(router, prevState, nextState)
    }

    for (const key in prevState) {
      if (!(key in nextState)) {
        const room = prevState[key]

        room && closeRoom(room)
      }
    }

    return nextState
  },

  onSelfMsg(sendToApp, msg, state) {
    return msg.proceed(sendToApp, state)
  }
})

export const callRTC = <T>(options: {
  secure: boolean
  server: string
  agent: string
  client: string
  iceServers: Array<string>
  onFailure(reason: string): T
  onConnect(stream: MediaStream): T
  onEnd: T
}): Sub<T> => {
  return sipManager.createSub(
    new Call(
      {
        protocol: options.secure ? WebSocketProtocol.WSS : WebSocketProtocol.WS,
        host: extractHost(options.server),
        port: extractPort(options.server),
        agent: options.agent,
        client: options.client,
        iceServers: options.iceServers
      },
      event => {
        return match(event, {
          Failure: options.onFailure,
          Connect: options.onConnect,
          Terminate: () => options.onEnd
        })
      }
    )
  )
}
