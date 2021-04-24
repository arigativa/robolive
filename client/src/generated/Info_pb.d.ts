// package: 
// file: Info.proto

import * as jspb from "google-protobuf";

export class AgentListRequest extends jspb.Message {
  hasName(): boolean;
  clearName(): void;
  getName(): string | undefined;
  setName(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AgentListRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AgentListRequest): AgentListRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AgentListRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AgentListRequest;
  static deserializeBinaryFromReader(message: AgentListRequest, reader: jspb.BinaryReader): AgentListRequest;
}

export namespace AgentListRequest {
  export type AsObject = {
    name?: string,
  }
}

export class AgentView extends jspb.Message {
  hasStatus(): boolean;
  clearStatus(): void;
  getStatus(): string | undefined;
  setStatus(value: string): void;

  hasName(): boolean;
  clearName(): void;
  getName(): string | undefined;
  setName(value: string): void;

  hasId(): boolean;
  clearId(): void;
  getId(): string | undefined;
  setId(value: string): void;

  hasIsavailableforconnection(): boolean;
  clearIsavailableforconnection(): void;
  getIsavailableforconnection(): boolean | undefined;
  setIsavailableforconnection(value: boolean): void;

  getSettingsMap(): jspb.Map<string, string>;
  clearSettingsMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AgentView.AsObject;
  static toObject(includeInstance: boolean, msg: AgentView): AgentView.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AgentView, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AgentView;
  static deserializeBinaryFromReader(message: AgentView, reader: jspb.BinaryReader): AgentView;
}

export namespace AgentView {
  export type AsObject = {
    status?: string,
    name?: string,
    id?: string,
    isavailableforconnection?: boolean,
    settingsMap: Array<[string, string]>,
  }
}

export class AgentListResponse extends jspb.Message {
  clearAgentlistList(): void;
  getAgentlistList(): Array<AgentView>;
  setAgentlistList(value: Array<AgentView>): void;
  addAgentlist(value?: AgentView, index?: number): AgentView;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AgentListResponse.AsObject;
  static toObject(includeInstance: boolean, msg: AgentListResponse): AgentListResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AgentListResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AgentListResponse;
  static deserializeBinaryFromReader(message: AgentListResponse, reader: jspb.BinaryReader): AgentListResponse;
}

export namespace AgentListResponse {
  export type AsObject = {
    agentlistList: Array<AgentView.AsObject>,
  }
}

