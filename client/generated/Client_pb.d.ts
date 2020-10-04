// package: 
// file: Client.proto

import * as jspb from "google-protobuf";

export class JoinRequest extends jspb.Message {
  hasName(): boolean;
  clearName(): void;
  getName(): string | undefined;
  setName(value: string): void;

  hasTargetid(): boolean;
  clearTargetid(): void;
  getTargetid(): string | undefined;
  setTargetid(value: string): void;

  getSettingsMap(): jspb.Map<string, string>;
  clearSettingsMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): JoinRequest.AsObject;
  static toObject(includeInstance: boolean, msg: JoinRequest): JoinRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: JoinRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): JoinRequest;
  static deserializeBinaryFromReader(message: JoinRequest, reader: jspb.BinaryReader): JoinRequest;
}

export namespace JoinRequest {
  export type AsObject = {
    name?: string,
    targetid?: string,
    settingsMap: Array<[string, string]>,
  }
}

export class JoinResponse extends jspb.Message {
  hasSuccess(): boolean;
  clearSuccess(): void;
  getSuccess(): JoinResponse.Success | undefined;
  setSuccess(value?: JoinResponse.Success): void;

  hasFailure(): boolean;
  clearFailure(): void;
  getFailure(): JoinResponse.Failure | undefined;
  setFailure(value?: JoinResponse.Failure): void;

  getMessageCase(): JoinResponse.MessageCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): JoinResponse.AsObject;
  static toObject(includeInstance: boolean, msg: JoinResponse): JoinResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: JoinResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): JoinResponse;
  static deserializeBinaryFromReader(message: JoinResponse, reader: jspb.BinaryReader): JoinResponse;
}

export namespace JoinResponse {
  export type AsObject = {
    success?: JoinResponse.Success.AsObject,
    failure?: JoinResponse.Failure.AsObject,
  }

  export class Success extends jspb.Message {
    getSettingsMap(): jspb.Map<string, string>;
    clearSettingsMap(): void;
    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Success.AsObject;
    static toObject(includeInstance: boolean, msg: Success): Success.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Success, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Success;
    static deserializeBinaryFromReader(message: Success, reader: jspb.BinaryReader): Success;
  }

  export namespace Success {
    export type AsObject = {
      settingsMap: Array<[string, string]>,
    }
  }

  export class Failure extends jspb.Message {
    hasReason(): boolean;
    clearReason(): void;
    getReason(): string | undefined;
    setReason(value: string): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Failure.AsObject;
    static toObject(includeInstance: boolean, msg: Failure): Failure.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Failure, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Failure;
    static deserializeBinaryFromReader(message: Failure, reader: jspb.BinaryReader): Failure;
  }

  export namespace Failure {
    export type AsObject = {
      reason?: string,
    }
  }

  export enum MessageCase {
    MESSAGE_NOT_SET = 0,
    SUCCESS = 1,
    FAILURE = 2,
  }
}

