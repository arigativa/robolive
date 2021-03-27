import Decode, { Decoder, errorToHumanReadable } from 'decode-json'
import Either from 'frctl/Either'

import { InfoEndpointClient } from './generated/Info_pb_service'
import { AgentListRequest, AgentView } from './generated/Info_pb'
import { ClientEndpointClient } from './generated/Client_pb_service'
import { JoinRequest } from './generated/Client_pb'

const REACT_APP_CLIENT_ENDPOINT_URL =
  process.env.REACT_APP_CLIENT_ENDPOINT_URL ?? ''

const REACT_APP_INFO_ENDPOINT_URL =
  process.env.REACT_APP_INFO_ENDPOINT_URL ?? ''

const infoClient = new InfoEndpointClient(REACT_APP_INFO_ENDPOINT_URL)

export interface Agent {
  id: string
  name: string
  status: string
  isAvailableForConnection: boolean
}

const agentViewToAgent = (agentView: AgentView.AsObject): null | Agent => {
  if (agentView.id == null) {
    return null
  }

  return {
    id: agentView.id,
    name: agentView.name ?? 'unknown',
    status: agentView.status ?? 'unknown',
    isAvailableForConnection: agentView.isavailableforconnection ?? false
  }
}

export const getAgentList = (options: {
  username: string
}): Promise<Either<string, Array<Agent>>> => {
  return new Promise(done => {
    const req = new AgentListRequest()
    req.setName(options.username)
    infoClient.agentList(req, (error, response) => {
      if (error) {
        done(Either.Left(error.message))
      }

      if (response) {
        const agentList = response
          .getAgentlistList()
          .map(agent => agentViewToAgent(agent.toObject()))
          .filter((agent): agent is Agent => agent != null)

        done(Either.Right(agentList))
      }
    })
  })
}

const clientClient = new ClientEndpointClient(REACT_APP_CLIENT_ENDPOINT_URL)

const keyValuesToRecord = <T>(
  keyValues: Array<[string, T]>
): Record<string, T> => {
  const acc: Record<string, T> = {}

  for (const [key, value] of keyValues) {
    acc[key] = value
  }

  return acc
}

export interface RoomConfiguration {
  signallingUri: string
  sipAgentName: string
  sipClientName: string
  stunUri: string
  turnUri: string
}

const roomConfigurationDecoder: Decoder<RoomConfiguration> = Decode.shape({
  signallingUri: Decode.field('signallingUri').string,
  sipAgentName: Decode.field('sipAgentName').string,
  sipClientName: Decode.field('sipClientName').string,
  stunUri: Decode.field('stunUri').string,
  turnUri: Decode.field('turnUri').string
})

export const joinRoom = (options: {
  username: string
  robotId: string
}): Promise<Either<string, RoomConfiguration>> => {
  return new Promise(done => {
    const req = new JoinRequest()

    req.setName(options.username)
    req.setTargetid(options.robotId)

    clientClient.join(req, (error, response) => {
      if (error) {
        done(Either.Left(error.message))
      }

      if (response) {
        const { failure, success } = response.toObject()

        if (failure?.reason) {
          done(Either.Left(failure.reason))
        }

        if (success) {
          const roomResult = roomConfigurationDecoder.decode(
            keyValuesToRecord(success.settingsMap)
          )

          if (roomResult.error) {
            done(Either.Left(errorToHumanReadable(roomResult.error)))
          } else {
            done(Either.Right(roomResult.value))
          }
        }
      }
    })
  })
}
