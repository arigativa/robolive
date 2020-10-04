// package: 
// file: Agent.proto

import * as Agent_pb from "./Agent_pb";
import {grpc} from "@improbable-eng/grpc-web";

type AgentEndpointRegister = {
  readonly methodName: string;
  readonly service: typeof AgentEndpoint;
  readonly requestStream: true;
  readonly responseStream: true;
  readonly requestType: typeof Agent_pb.AgentMessage;
  readonly responseType: typeof Agent_pb.RegistryMessage;
};

export class AgentEndpoint {
  static readonly serviceName: string;
  static readonly Register: AgentEndpointRegister;
}

export type ServiceError = { message: string, code: number; metadata: grpc.Metadata }
export type Status = { details: string, code: number; metadata: grpc.Metadata }

interface UnaryResponse {
  cancel(): void;
}
interface ResponseStream<T> {
  cancel(): void;
  on(type: 'data', handler: (message: T) => void): ResponseStream<T>;
  on(type: 'end', handler: (status?: Status) => void): ResponseStream<T>;
  on(type: 'status', handler: (status: Status) => void): ResponseStream<T>;
}
interface RequestStream<T> {
  write(message: T): RequestStream<T>;
  end(): void;
  cancel(): void;
  on(type: 'end', handler: (status?: Status) => void): RequestStream<T>;
  on(type: 'status', handler: (status: Status) => void): RequestStream<T>;
}
interface BidirectionalStream<ReqT, ResT> {
  write(message: ReqT): BidirectionalStream<ReqT, ResT>;
  end(): void;
  cancel(): void;
  on(type: 'data', handler: (message: ResT) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'end', handler: (status?: Status) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'status', handler: (status: Status) => void): BidirectionalStream<ReqT, ResT>;
}

export class AgentEndpointClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  register(metadata?: grpc.Metadata): BidirectionalStream<Agent_pb.AgentMessage, Agent_pb.RegistryMessage>;
}

