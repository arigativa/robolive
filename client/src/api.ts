import Either from 'frctl/Either'

import { Cmd } from 'core'
import { AgentListRequest, AgentView } from './generated/Info_pb'
import { InfoEndpointClient, ServiceError } from './generated/Info_pb_service'
import { BrowserHeaders } from 'browser-headers'

export type { ServiceError } from './generated/Info_pb_service'

const infoReq = new InfoEndpointClient('http://rl.arigativa.ru:10477')

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

export const getAgentList = <A>(
  tagger: (result: Either<ServiceError, Array<Agent>>) => A
): Cmd<A> => {
  return Cmd.create(done => {
    infoReq.agentList(
      new AgentListRequest(),
      new BrowserHeaders(),
      (error, response) => {
        if (error) {
          done(tagger(Either.Left(error)))
        }

        if (response) {
          const agentList = response
            .getAgentlistList()
            .map(agent => agentViewToAgent(agent.toObject()))
            .filter((agent): agent is Agent => agent != null)

          done(tagger(Either.Right(agentList)))
        }
      }
    )
  })
}
