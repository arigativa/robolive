// package: 
// file: Storage.proto

import * as Storage_pb from "./Storage_pb";
import * as Common_pb from "./Common_pb";
import {grpc} from "@improbable-eng/grpc-web";

type StorageEndpointGet = {
  readonly methodName: string;
  readonly service: typeof StorageEndpoint;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof Storage_pb.ReadRequest;
  readonly responseType: typeof Storage_pb.ReadResponse;
};

type StorageEndpointSet = {
  readonly methodName: string;
  readonly service: typeof StorageEndpoint;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof Storage_pb.WriteRequest;
  readonly responseType: typeof Common_pb.Empty;
};

export class StorageEndpoint {
  static readonly serviceName: string;
  static readonly Get: StorageEndpointGet;
  static readonly Set: StorageEndpointSet;
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

export class StorageEndpointClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  get(
    requestMessage: Storage_pb.ReadRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: Storage_pb.ReadResponse|null) => void
  ): UnaryResponse;
  get(
    requestMessage: Storage_pb.ReadRequest,
    callback: (error: ServiceError|null, responseMessage: Storage_pb.ReadResponse|null) => void
  ): UnaryResponse;
  set(
    requestMessage: Storage_pb.WriteRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: Common_pb.Empty|null) => void
  ): UnaryResponse;
  set(
    requestMessage: Storage_pb.WriteRequest,
    callback: (error: ServiceError|null, responseMessage: Common_pb.Empty|null) => void
  ): UnaryResponse;
}

