// package: 
// file: Session.proto

import * as jspb from "google-protobuf";
import * as Common_pb from "./Common_pb";

export class OngoingSession extends jspb.Message {
  hasClientid(): boolean;
  clearClientid(): void;
  getClientid(): string | undefined;
  setClientid(value: string): void;

  hasAgentid(): boolean;
  clearAgentid(): void;
  getAgentid(): string | undefined;
  setAgentid(value: string): void;

  hasDurationinseconds(): boolean;
  clearDurationinseconds(): void;
  getDurationinseconds(): number | undefined;
  setDurationinseconds(value: number): void;

  hasTimeleftinseconds(): boolean;
  clearTimeleftinseconds(): void;
  getTimeleftinseconds(): number | undefined;
  setTimeleftinseconds(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OngoingSession.AsObject;
  static toObject(includeInstance: boolean, msg: OngoingSession): OngoingSession.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: OngoingSession, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OngoingSession;
  static deserializeBinaryFromReader(message: OngoingSession, reader: jspb.BinaryReader): OngoingSession;
}

export namespace OngoingSession {
  export type AsObject = {
    clientid?: string,
    agentid?: string,
    durationinseconds?: number,
    timeleftinseconds?: number,
  }
}

export class OngoingSessions extends jspb.Message {
  clearOngoingsessionsList(): void;
  getOngoingsessionsList(): Array<OngoingSession>;
  setOngoingsessionsList(value: Array<OngoingSession>): void;
  addOngoingsessions(value?: OngoingSession, index?: number): OngoingSession;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OngoingSessions.AsObject;
  static toObject(includeInstance: boolean, msg: OngoingSessions): OngoingSessions.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: OngoingSessions, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OngoingSessions;
  static deserializeBinaryFromReader(message: OngoingSessions, reader: jspb.BinaryReader): OngoingSessions;
}

export namespace OngoingSessions {
  export type AsObject = {
    ongoingsessionsList: Array<OngoingSession.AsObject>,
  }
}

export class AllowedSession extends jspb.Message {
  hasClientid(): boolean;
  clearClientid(): void;
  getClientid(): string | undefined;
  setClientid(value: string): void;

  hasAgentid(): boolean;
  clearAgentid(): void;
  getAgentid(): string | undefined;
  setAgentid(value: string): void;

  hasDurationinseconds(): boolean;
  clearDurationinseconds(): void;
  getDurationinseconds(): number | undefined;
  setDurationinseconds(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AllowedSession.AsObject;
  static toObject(includeInstance: boolean, msg: AllowedSession): AllowedSession.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AllowedSession, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AllowedSession;
  static deserializeBinaryFromReader(message: AllowedSession, reader: jspb.BinaryReader): AllowedSession;
}

export namespace AllowedSession {
  export type AsObject = {
    clientid?: string,
    agentid?: string,
    durationinseconds?: number,
  }
}

export class AllowedSessions extends jspb.Message {
  clearAllowedsessionsList(): void;
  getAllowedsessionsList(): Array<AllowedSession>;
  setAllowedsessionsList(value: Array<AllowedSession>): void;
  addAllowedsessions(value?: AllowedSession, index?: number): AllowedSession;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AllowedSessions.AsObject;
  static toObject(includeInstance: boolean, msg: AllowedSessions): AllowedSessions.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AllowedSessions, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AllowedSessions;
  static deserializeBinaryFromReader(message: AllowedSessions, reader: jspb.BinaryReader): AllowedSessions;
}

export namespace AllowedSessions {
  export type AsObject = {
    allowedsessionsList: Array<AllowedSession.AsObject>,
  }
}

export class AllowSession extends jspb.Message {
  hasClientid(): boolean;
  clearClientid(): void;
  getClientid(): string | undefined;
  setClientid(value: string): void;

  hasAgentid(): boolean;
  clearAgentid(): void;
  getAgentid(): string | undefined;
  setAgentid(value: string): void;

  hasDurationinseconds(): boolean;
  clearDurationinseconds(): void;
  getDurationinseconds(): number | undefined;
  setDurationinseconds(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AllowSession.AsObject;
  static toObject(includeInstance: boolean, msg: AllowSession): AllowSession.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AllowSession, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AllowSession;
  static deserializeBinaryFromReader(message: AllowSession, reader: jspb.BinaryReader): AllowSession;
}

export namespace AllowSession {
  export type AsObject = {
    clientid?: string,
    agentid?: string,
    durationinseconds?: number,
  }
}

export class EvictedSession extends jspb.Message {
  hasClientid(): boolean;
  clearClientid(): void;
  getClientid(): string | undefined;
  setClientid(value: string): void;

  hasAgentid(): boolean;
  clearAgentid(): void;
  getAgentid(): string | undefined;
  setAgentid(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvictedSession.AsObject;
  static toObject(includeInstance: boolean, msg: EvictedSession): EvictedSession.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvictedSession, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvictedSession;
  static deserializeBinaryFromReader(message: EvictedSession, reader: jspb.BinaryReader): EvictedSession;
}

export namespace EvictedSession {
  export type AsObject = {
    clientid?: string,
    agentid?: string,
  }
}

export class EvictedSessions extends jspb.Message {
  clearEvictedsessionsList(): void;
  getEvictedsessionsList(): Array<EvictedSession>;
  setEvictedsessionsList(value: Array<EvictedSession>): void;
  addEvictedsessions(value?: EvictedSession, index?: number): EvictedSession;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvictedSessions.AsObject;
  static toObject(includeInstance: boolean, msg: EvictedSessions): EvictedSessions.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvictedSessions, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvictedSessions;
  static deserializeBinaryFromReader(message: EvictedSessions, reader: jspb.BinaryReader): EvictedSessions;
}

export namespace EvictedSessions {
  export type AsObject = {
    evictedsessionsList: Array<EvictedSession.AsObject>,
  }
}

export class EvictSession extends jspb.Message {
  hasClientid(): boolean;
  clearClientid(): void;
  getClientid(): string | undefined;
  setClientid(value: string): void;

  hasAgentid(): boolean;
  clearAgentid(): void;
  getAgentid(): string | undefined;
  setAgentid(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvictSession.AsObject;
  static toObject(includeInstance: boolean, msg: EvictSession): EvictSession.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvictSession, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvictSession;
  static deserializeBinaryFromReader(message: EvictSession, reader: jspb.BinaryReader): EvictSession;
}

export namespace EvictSession {
  export type AsObject = {
    clientid?: string,
    agentid?: string,
  }
}

