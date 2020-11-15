// package: 
// file: Client.proto

import * as Client_pb from "./Client_pb";
import {grpc} from "@improbable-eng/grpc-web";

type ClientEndpointJoin = {
  readonly methodName: string;
  readonly service: typeof ClientEndpoint;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof Client_pb.JoinRequest;
  readonly responseType: typeof Client_pb.JoinResponse;
};

export class ClientEndpoint {
  static readonly serviceName: string;
  static readonly Join: ClientEndpointJoin;
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

export class ClientEndpointClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  join(
    requestMessage: Client_pb.JoinRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: Client_pb.JoinResponse|null) => void
  ): UnaryResponse;
  join(
    requestMessage: Client_pb.JoinRequest,
    callback: (error: ServiceError|null, responseMessage: Client_pb.JoinResponse|null) => void
  ): UnaryResponse;
}

