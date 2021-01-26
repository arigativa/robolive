import Decode, { Decoder, errorToHumanReadable } from 'decode-json'
import Either from 'frctl/Either'

import { InfoEndpointClient } from './generated/Info_pb_service'
import { AgentListRequest, AgentView } from './generated/Info_pb'
import { ClientEndpointClient } from './generated/Client_pb_service'
import { JoinRequest } from './generated/Client_pb'

const infoClient = new InfoEndpointClient('https://rl.arigativa.ru:10477')

export interface Agent {
  id: string
  name: string
  status: string
}

const agentViewToAgent = (agentView: AgentView.AsObject): null | Agent => {
  if (agentView.id == null) {
    return null
  }

  return {
    id: agentView.id,
    name: agentView.name ?? 'unknown',
    status: agentView.status ?? 'unknown'
  }
}

export const getAgentList = (): Promise<Either<string, Array<Agent>>> => {
  return new Promise(done => {
    infoClient.agentList(new AgentListRequest(), (error, response) => {
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

const clientClient = new ClientEndpointClient('https://rl.arigativa.ru:10478')

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
