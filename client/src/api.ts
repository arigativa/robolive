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

export const joinRoom = (options: {
  username: string
  robotId: string
}): Promise<Either<string, Array<[string, string]>>> => {
  return new Promise(done => {
    const req = new JoinRequest()
    const settings = req.getSettingsMap()

    settings.set('videoSrcFn', 'circles"')
    settings.set('videoSrcFn1', 'jetson_camera_scaled(0,3,270)"')
    settings.set('videoSrcFn2', 'jetson_camera(0,3)')
    settings.set('servoControllerType', 'FAKE')

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
          done(Either.Right(success.settingsMap))
        }
      }
    })
  })
}
