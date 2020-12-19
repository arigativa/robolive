import { WebSocketInterface, UA } from 'jssip/lib/JsSIP'
import { UAConfiguration } from 'jssip/lib/UA'
import { debug } from 'jssip/lib/JsSIP'
import Either from 'frctl/Either'

debug.enable('JsSIP:*')

export { UA as UserAgent } from 'jssip/lib/JsSIP'

// eslint-disable-next-line no-shadow
export enum WebSocketProtocol {
  WS = 'ws',
  WSS = 'wss'
}

const buildWebSocketUrl = (
  protocol: WebSocketProtocol,
  server: string,
  port?: number
): string => {
  const url = `${protocol}://${server}`

  if (port == null) {
    return url
  }

  return `${url}:${port}`
}

const buildUri = (username: string, server: string): string => {
  return `sip:${username}@${server}`
}

export type RegisterOptions = {
  protocol: WebSocketProtocol
  server: string
  port?: number
  register?: boolean
  username: string
  password?: string
}

export const register = (
  options: RegisterOptions
): Promise<Either<string, UA>> => {
  const webSocketUrl = buildWebSocketUrl(
    options.protocol,
    options.server,
    options.port
  )
  const uri = buildUri(options.username, options.server)
  const uaConfig: UAConfiguration = {
    sockets: [new WebSocketInterface(webSocketUrl)],
    uri: uri,
    display_name: options.username,
    register: options.register
  }

  if (options.password != null) {
    uaConfig.authorization_user = options.username
    uaConfig.password = options.password
  }

  return new Promise(done => {
    const ua = new UA(uaConfig)

    ua.on('registrationFailed', ({ response }) => {
      done(Either.Left(response.reason_phrase))

      ua.stop()
    })

    ua.on('registered', () => {
      done(Either.Right(ua))
    })

    ua.start()
  })
}
