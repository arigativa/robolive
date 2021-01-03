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
  return server.replace(/:\d+$/, '')
}

const extractPort = (server: string): string | null => {
  return server.replace(/^.+:/, '') || null
}

const buildUri = (username: string, host: string): string => {
  return `sip:${username}@${host}`
}

interface Listeners<AppMsg> {
  onFailure: Array<(reason: string) => AppMsg>
  onTerminate: Array<AppMsg>
  onConnect: Array<(stream: MediaStream) => AppMsg>
}

interface Room<AppMsg> {
  ua: null | UA
  session: null | RTCSession
  listeners: Listeners<AppMsg>
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
    private readonly session: RTCSession
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
        session: this.session
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

    room.session?.terminate()
    room.ua?.stop()

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

    room.session?.terminate()
    room.ua?.stop()

    const { [this.key]: _, ...nextState } = state

    return nextState
  }
}

interface SipSub<AppMsg> extends Functor<AppMsg> {
  register(
    router: Router<AppMsg, SipSelfMsg<AppMsg>>,
    prevState: State<AppMsg>,
    nextState: State<AppMsg>
  ): State<AppMsg>
}

interface RegisterOptions {
  protocol: WebSocketProtocol
  host: string
  port: null | string
  agent: string
  client: string
  withAudio: boolean
  withVideo: boolean
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
  ): State<AppMsg> {
    const key = JSON.stringify(this.options)

    const newRoom = nextState[key]

    if (newRoom != null) {
      newRoom.listeners = pushListeners(this.onEvent, newRoom.listeners)

      return nextState
    }

    const oldRoom = prevState[key]

    if (oldRoom != null) {
      return {
        ...nextState,
        [key]: {
          ...oldRoom,
          listeners: pushListeners(this.onEvent)
        }
      }
    }

    const webSocketUrl = buildWebSocketUrl(
      this.options.protocol,
      this.options.host,
      this.options.port
    )

    const ua = new UA({
      uri: buildUri(this.options.client, this.options.host),
      sockets: [new WebSocketInterface(webSocketUrl)],
      display_name: this.options.client,
      register: true
    })

    ua.on('registrationFailed', ({ response }) => {
      router.sendToSelf(new StopUserAgent(key, response.reason_phrase))
    })

    ua.on('registered', () => {
      const session = ua.call(buildUri(this.options.agent, this.options.host), {
        mediaConstraints: {
          audio: this.options.withAudio,
          video: this.options.withVideo
        },
        pcConfig: {
          rtcpMuxPolicy: 'negotiate',
          iceServers: this.options.iceServers.map(url => ({ urls: url }))
        }
      })

      session.on('failed', event => {
        router.sendToSelf(new StopUserAgent(key, event.cause))
      })

      session.on('ended', () => {
        router.sendToSelf(new TerminateSession(key))
      })

      session.on('confirmed', () => {
        router.sendToSelf(new RegisterSession(key, session))
      })
    })

    ua.start()

    return {
      ...nextState,
      [key]: {
        ua,
        session: null,
        listeners: pushListeners(this.onEvent)
      }
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
  init: () => ({}),

  onEffects: (router, cmds, subs, prevState) => {
    const nextState: State<unknown> = {}

    for (const sub of subs) {
      sub.register(router, prevState, nextState)
    }

    for (const key in prevState) {
      if (!(key in nextState)) {
        const room = prevState[key]

        room?.ua?.stop()
        room?.session?.terminate()
      }
    }

    return nextState
  },

  onSelfMsg: (sendToApp, msg, state) => {
    return msg.proceed(sendToApp, state)
  }
})

export const callRTC = <T>(options: {
  secure: boolean
  server: string
  agent: string
  client: string
  withAudio: boolean
  withVideo: boolean
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
        withAudio: options.withAudio,
        withVideo: options.withVideo,
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
