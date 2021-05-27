import Decode, { Decoder, errorToHumanReadable } from 'decode-json'
import Either from 'frctl/Either'

import { isDefined } from 'utils'
import { InfoEndpointClient } from './generated/Info_pb_service'
import { AgentListRequest, AgentView } from './generated/Info_pb'
import { ClientEndpointClient } from './generated/Client_pb_service'
import {
  JoinRequest,
  Button,
  UIDescription,
  GetUIDescriptionRequest,
  AddUIDescriptionRequest
} from './generated/Client_pb'

const CLIENT_ENDPOINT_URL = process.env.REACT_APP_CLIENT_ENDPOINT_URL ?? ''
const INFO_ENDPOINT_URL = process.env.REACT_APP_INFO_ENDPOINT_URL ?? ''

const infoEndpoint = new InfoEndpointClient(INFO_ENDPOINT_URL)

export interface Agent {
  id: string
  name: string
  status: string
  isAvailable: boolean
  restreamUrl?: string
}

const agentViewToAgent = (
  agentView: AgentView.AsObject,
  restreamUrl?: string
): null | Agent => {
  if (agentView.id == null) {
    return null
  }

  return {
    id: agentView.id,
    name: agentView.name ?? 'unknown',
    status: agentView.status ?? 'unknown',
    isAvailable: agentView.isavailableforconnection ?? false,
    restreamUrl
  }
}

export const getAgentList = (options: {
  username: string
}): Promise<Either<string, Array<Agent>>> => {
  return new Promise(done => {
    const req = new AgentListRequest()

    req.setName(options.username)
    infoEndpoint.agentList(req, (error, response) => {
      if (error) {
        done(Either.Left(error.message))
      } else {
        const agentList = response!
          .getAgentlistList()
          .map(agent => {
            return agentViewToAgent(
              agent.toObject(),
              agent.getSettingsMap().get('shareRestreamLink')
            )
          })
          .filter(isDefined)

        done(Either.Right(agentList))
      }
    })
  })
}

const clientEndpoint = new ClientEndpointClient(CLIENT_ENDPOINT_URL)

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

    clientEndpoint.join(req, (error, response) => {
      if (error) {
        done(Either.Left(error.message))
      } else {
        const { failure, success } = response!.toObject()

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

export interface InfoTemplate {
  name: string
  content: string
  hotkey: null | string
}

const SECRET_SYMBOL = '🥑🍑🥕'

const infoTemplateContentDecoder = Decode.shape({
  secret: Decode.index(0).exact(SECRET_SYMBOL),
  content: Decode.index(1).string,
  hotkey: Decode.index(2).optional.string
})

const infoTemplateDecoder: Decoder<InfoTemplate> = Decode.tuple([
  Decode.field('name').string,
  Decode.field('content').string.map(str => {
    const result = infoTemplateContentDecoder.decodeJSON(str)

    return result.value ?? { content: str, hotkey: null }
  })
]).map(([name, { content, hotkey }]) => ({ name, content, hotkey }))

export const saveInfoTemplates = (
  options: {
    username: string
    robotId: string
  },
  templates: Array<InfoTemplate>
): Promise<Either<string, null>> => {
  return new Promise(done => {
    const descripiton = new UIDescription()

    descripiton.setButtonsList(
      templates.map(({ name, content, hotkey }) => {
        const btn = new Button()

        btn.setName(name)
        btn.setTemplate(JSON.stringify([SECRET_SYMBOL, content, hotkey]))

        return btn
      })
    )

    const req = new AddUIDescriptionRequest()

    req.setName(options.username)
    req.setTargetid(options.robotId)
    req.setUidescription(descripiton)

    clientEndpoint.addUiDescription(req, error => {
      if (error) {
        done(Either.Left(error.message))
      } else {
        done(Either.Right(null))
      }
    })
  })
}

export const getInfoTemplates = (options: {
  username: string
  robotId: string
}): Promise<Either<string, Array<InfoTemplate>>> => {
  return new Promise(done => {
    const req = new GetUIDescriptionRequest()

    req.setName(options.username)
    req.setTargetid(options.robotId)

    clientEndpoint.getUiDescription(req, (error, response) => {
      if (error) {
        done(Either.Left(error.message))
      } else {
        const infoTemplates = response!
          .getButtonsList()
          .map(btn => {
            return (
              infoTemplateDecoder.decode({
                name: btn.getName(),
                content: btn.getTemplate()
              }).value ?? null
            )
          })
          .filter(isDefined)

        done(Either.Right(infoTemplates))
      }
    })
  })
}
