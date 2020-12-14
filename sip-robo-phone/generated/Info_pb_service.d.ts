// package: 
// file: Info.proto

import * as Info_pb from "./Info_pb";
import {grpc} from "@improbable-eng/grpc-web";

type InfoEndpointAgentList = {
  readonly methodName: string;
  readonly service: typeof InfoEndpoint;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof Info_pb.AgentListRequest;
  readonly responseType: typeof Info_pb.AgentListResponse;
};

export class InfoEndpoint {
  static readonly serviceName: string;
  static readonly AgentList: InfoEndpointAgentList;
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

export class InfoEndpointClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  agentList(
    requestMessage: Info_pb.AgentListRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: Info_pb.AgentListResponse|null) => void
  ): UnaryResponse;
  agentList(
    requestMessage: Info_pb.AgentListRequest,
    callback: (error: ServiceError|null, responseMessage: Info_pb.AgentListResponse|null) => void
  ): UnaryResponse;
}

