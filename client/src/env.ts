import Decode from 'frctl/Json/Decode'
import { WebSocketProtocol } from 'sip'

export const SIP_URL = Decode.string
  .decode(process.env.REACT_APP_SIP_URL)
  .getOrElse('http://localhost:1234')

export const SIP_PROTOCOL = Decode.enums([
  ['ws', WebSocketProtocol.WS],
  ['wss', WebSocketProtocol.WSS]
])
  .decode(process.env.REACT_APP_SIP_PROTOCOL)
  .getOrElse(WebSocketProtocol.WS)

export const SIP_SERVER = Decode.string
  .decode(process.env.REACT_APP_SIP_SERVER)
  .getOrElse('localhost')

export const SIP_PORT = Decode.int
  .decode(process.env.REACT_APP_SIP_PORT)
  .getOrElse(1234)
