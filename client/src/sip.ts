import { WebSocketInterface, UA } from 'jssip/lib/JsSIP'
import { UAConfiguration } from 'jssip/lib/UA'
import { debug } from 'jssip/lib/JsSIP'
import Either from 'frctl/Either'

debug.enable('JsSIP:*')

export { UA as UserAgent } from 'jssip/lib/JsSIP'

export type WebSocketProtocol = 'ws' | 'wss'

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
  register: boolean
  username: string
  password?: string
  onRegistration(result: Either<string, UA>): void
}

export const register = (options: RegisterOptions): void => {
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

  const ua = new UA(uaConfig)

  ua.on('registrationFailed', ({ response }) => {
    options.onRegistration(Either.Left(response.reason_phrase))

    ua.stop()
  })

  ua.on('registered', () => {
    options.onRegistration(Either.Right(ua))
  })

  ua.start()
}
