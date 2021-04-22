// package: 
// file: Session.proto

import * as Session_pb from "./Session_pb";
import * as Common_pb from "./Common_pb";
import {grpc} from "@improbable-eng/grpc-web";

type SessionEndpointGetAllowedSessions = {
  readonly methodName: string;
  readonly service: typeof SessionEndpoint;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof Common_pb.Empty;
  readonly responseType: typeof Session_pb.AllowedSessions;
};

type SessionEndpointGetEvictedSessions = {
  readonly methodName: string;
  readonly service: typeof SessionEndpoint;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof Common_pb.Empty;
  readonly responseType: typeof Session_pb.EvictedSessions;
};

type SessionEndpointGetOngoingSessions = {
  readonly methodName: string;
  readonly service: typeof SessionEndpoint;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof Common_pb.Empty;
  readonly responseType: typeof Session_pb.OngoingSessions;
};

type SessionEndpointDoAllowSession = {
  readonly methodName: string;
  readonly service: typeof SessionEndpoint;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof Session_pb.AllowSession;
  readonly responseType: typeof Common_pb.Empty;
};

type SessionEndpointDoEvictSession = {
  readonly methodName: string;
  readonly service: typeof SessionEndpoint;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof Session_pb.EvictSession;
  readonly responseType: typeof Common_pb.Empty;
};

export class SessionEndpoint {
  static readonly serviceName: string;
  static readonly GetAllowedSessions: SessionEndpointGetAllowedSessions;
  static readonly GetEvictedSessions: SessionEndpointGetEvictedSessions;
  static readonly GetOngoingSessions: SessionEndpointGetOngoingSessions;
  static readonly DoAllowSession: SessionEndpointDoAllowSession;
  static readonly DoEvictSession: SessionEndpointDoEvictSession;
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

export class SessionEndpointClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  getAllowedSessions(
    requestMessage: Common_pb.Empty,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: Session_pb.AllowedSessions|null) => void
  ): UnaryResponse;
  getAllowedSessions(
    requestMessage: Common_pb.Empty,
    callback: (error: ServiceError|null, responseMessage: Session_pb.AllowedSessions|null) => void
  ): UnaryResponse;
  getEvictedSessions(
    requestMessage: Common_pb.Empty,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: Session_pb.EvictedSessions|null) => void
  ): UnaryResponse;
  getEvictedSessions(
    requestMessage: Common_pb.Empty,
    callback: (error: ServiceError|null, responseMessage: Session_pb.EvictedSessions|null) => void
  ): UnaryResponse;
  getOngoingSessions(
    requestMessage: Common_pb.Empty,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: Session_pb.OngoingSessions|null) => void
  ): UnaryResponse;
  getOngoingSessions(
    requestMessage: Common_pb.Empty,
    callback: (error: ServiceError|null, responseMessage: Session_pb.OngoingSessions|null) => void
  ): UnaryResponse;
  doAllowSession(
    requestMessage: Session_pb.AllowSession,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: Common_pb.Empty|null) => void
  ): UnaryResponse;
  doAllowSession(
    requestMessage: Session_pb.AllowSession,
    callback: (error: ServiceError|null, responseMessage: Common_pb.Empty|null) => void
  ): UnaryResponse;
  doEvictSession(
    requestMessage: Session_pb.EvictSession,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: Common_pb.Empty|null) => void
  ): UnaryResponse;
  doEvictSession(
    requestMessage: Session_pb.EvictSession,
    callback: (error: ServiceError|null, responseMessage: Common_pb.Empty|null) => void
  ): UnaryResponse;
}

