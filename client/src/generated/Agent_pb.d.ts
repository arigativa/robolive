// package: 
// file: Agent.proto

import * as jspb from "google-protobuf";

export class AgentMessage extends jspb.Message {
  hasRegister(): boolean;
  clearRegister(): void;
  getRegister(): AgentMessage.RegisterRequest | undefined;
  setRegister(value?: AgentMessage.RegisterRequest): void;

  hasJoin(): boolean;
  clearJoin(): void;
  getJoin(): AgentMessage.JoinDecision | undefined;
  setJoin(value?: AgentMessage.JoinDecision): void;

  hasStatusupdate(): boolean;
  clearStatusupdate(): void;
  getStatusupdate(): AgentMessage.StatusUpdate | undefined;
  setStatusupdate(value?: AgentMessage.StatusUpdate): void;

  hasSettingupdate(): boolean;
  clearSettingupdate(): void;
  getSettingupdate(): AgentMessage.SettingUpdate | undefined;
  setSettingupdate(value?: AgentMessage.SettingUpdate): void;

  getMessageCase(): AgentMessage.MessageCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AgentMessage.AsObject;
  static toObject(includeInstance: boolean, msg: AgentMessage): AgentMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AgentMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AgentMessage;
  static deserializeBinaryFromReader(message: AgentMessage, reader: jspb.BinaryReader): AgentMessage;
}

export namespace AgentMessage {
  export type AsObject = {
    register?: AgentMessage.RegisterRequest.AsObject,
    join?: AgentMessage.JoinDecision.AsObject,
    statusupdate?: AgentMessage.StatusUpdate.AsObject,
    settingupdate?: AgentMessage.SettingUpdate.AsObject,
  }

  export class RegisterRequest extends jspb.Message {
    hasName(): boolean;
    clearName(): void;
    getName(): string | undefined;
    setName(value: string): void;

    hasLogin(): boolean;
    clearLogin(): void;
    getLogin(): string | undefined;
    setLogin(value: string): void;

    hasPassword(): boolean;
    clearPassword(): void;
    getPassword(): string | undefined;
    setPassword(value: string): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RegisterRequest.AsObject;
    static toObject(includeInstance: boolean, msg: RegisterRequest): RegisterRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RegisterRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RegisterRequest;
    static deserializeBinaryFromReader(message: RegisterRequest, reader: jspb.BinaryReader): RegisterRequest;
  }

  export namespace RegisterRequest {
    export type AsObject = {
      name?: string,
      login?: string,
      password?: string,
    }
  }

  export class StatusUpdate extends jspb.Message {
    hasStatus(): boolean;
    clearStatus(): void;
    getStatus(): string | undefined;
    setStatus(value: string): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StatusUpdate.AsObject;
    static toObject(includeInstance: boolean, msg: StatusUpdate): StatusUpdate.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StatusUpdate, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StatusUpdate;
    static deserializeBinaryFromReader(message: StatusUpdate, reader: jspb.BinaryReader): StatusUpdate;
  }

  export namespace StatusUpdate {
    export type AsObject = {
      status?: string,
    }
  }

  export class SettingUpdate extends jspb.Message {
    hasKey(): boolean;
    clearKey(): void;
    getKey(): string | undefined;
    setKey(value: string): void;

    hasValue(): boolean;
    clearValue(): void;
    getValue(): string | undefined;
    setValue(value: string): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SettingUpdate.AsObject;
    static toObject(includeInstance: boolean, msg: SettingUpdate): SettingUpdate.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SettingUpdate, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SettingUpdate;
    static deserializeBinaryFromReader(message: SettingUpdate, reader: jspb.BinaryReader): SettingUpdate;
  }

  export namespace SettingUpdate {
    export type AsObject = {
      key?: string,
      value?: string,
    }
  }

  export class JoinDecision extends jspb.Message {
    hasAccepted(): boolean;
    clearAccepted(): void;
    getAccepted(): AgentMessage.JoinDecision.Accepted | undefined;
    setAccepted(value?: AgentMessage.JoinDecision.Accepted): void;

    hasDeclined(): boolean;
    clearDeclined(): void;
    getDeclined(): AgentMessage.JoinDecision.Declined | undefined;
    setDeclined(value?: AgentMessage.JoinDecision.Declined): void;

    getMessageCase(): JoinDecision.MessageCase;
    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): JoinDecision.AsObject;
    static toObject(includeInstance: boolean, msg: JoinDecision): JoinDecision.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: JoinDecision, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): JoinDecision;
    static deserializeBinaryFromReader(message: JoinDecision, reader: jspb.BinaryReader): JoinDecision;
  }

  export namespace JoinDecision {
    export type AsObject = {
      accepted?: AgentMessage.JoinDecision.Accepted.AsObject,
      declined?: AgentMessage.JoinDecision.Declined.AsObject,
    }

    export class Accepted extends jspb.Message {
      getSettingsMap(): jspb.Map<string, string>;
      clearSettingsMap(): void;
      hasRequestid(): boolean;
      clearRequestid(): void;
      getRequestid(): string | undefined;
      setRequestid(value: string): void;

      serializeBinary(): Uint8Array;
      toObject(includeInstance?: boolean): Accepted.AsObject;
      static toObject(includeInstance: boolean, msg: Accepted): Accepted.AsObject;
      static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
      static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
      static serializeBinaryToWriter(message: Accepted, writer: jspb.BinaryWriter): void;
      static deserializeBinary(bytes: Uint8Array): Accepted;
      static deserializeBinaryFromReader(message: Accepted, reader: jspb.BinaryReader): Accepted;
    }

    export namespace Accepted {
      export type AsObject = {
        settingsMap: Array<[string, string]>,
        requestid?: string,
      }
    }

    export class Declined extends jspb.Message {
      hasReason(): boolean;
      clearReason(): void;
      getReason(): string | undefined;
      setReason(value: string): void;

      hasRequestid(): boolean;
      clearRequestid(): void;
      getRequestid(): string | undefined;
      setRequestid(value: string): void;

      serializeBinary(): Uint8Array;
      toObject(includeInstance?: boolean): Declined.AsObject;
      static toObject(includeInstance: boolean, msg: Declined): Declined.AsObject;
      static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
      static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
      static serializeBinaryToWriter(message: Declined, writer: jspb.BinaryWriter): void;
      static deserializeBinary(bytes: Uint8Array): Declined;
      static deserializeBinaryFromReader(message: Declined, reader: jspb.BinaryReader): Declined;
    }

    export namespace Declined {
      export type AsObject = {
        reason?: string,
        requestid?: string,
      }
    }

    export enum MessageCase {
      MESSAGE_NOT_SET = 0,
      ACCEPTED = 1,
      DECLINED = 2,
    }
  }

  export enum MessageCase {
    MESSAGE_NOT_SET = 0,
    REGISTER = 1,
    JOIN = 2,
    STATUSUPDATE = 3,
    SETTINGUPDATE = 4,
  }
}

export class RegistryMessage extends jspb.Message {
  hasRegistered(): boolean;
  clearRegistered(): void;
  getRegistered(): RegistryMessage.RegisterResponse | undefined;
  setRegistered(value?: RegistryMessage.RegisterResponse): void;

  hasConnected(): boolean;
  clearConnected(): void;
  getConnected(): RegistryMessage.Connected | undefined;
  setConnected(value?: RegistryMessage.Connected): void;

  getMessageCase(): RegistryMessage.MessageCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RegistryMessage.AsObject;
  static toObject(includeInstance: boolean, msg: RegistryMessage): RegistryMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: RegistryMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RegistryMessage;
  static deserializeBinaryFromReader(message: RegistryMessage, reader: jspb.BinaryReader): RegistryMessage;
}

export namespace RegistryMessage {
  export type AsObject = {
    registered?: RegistryMessage.RegisterResponse.AsObject,
    connected?: RegistryMessage.Connected.AsObject,
  }

  export class RegisterResponse extends jspb.Message {
    hasConnectionid(): boolean;
    clearConnectionid(): void;
    getConnectionid(): string | undefined;
    setConnectionid(value: string): void;

    hasLogin(): boolean;
    clearLogin(): void;
    getLogin(): string | undefined;
    setLogin(value: string): void;

    hasPassword(): boolean;
    clearPassword(): void;
    getPassword(): string | undefined;
    setPassword(value: string): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RegisterResponse.AsObject;
    static toObject(includeInstance: boolean, msg: RegisterResponse): RegisterResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RegisterResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RegisterResponse;
    static deserializeBinaryFromReader(message: RegisterResponse, reader: jspb.BinaryReader): RegisterResponse;
  }

  export namespace RegisterResponse {
    export type AsObject = {
      connectionid?: string,
      login?: string,
      password?: string,
    }
  }

  export class Connected extends jspb.Message {
    hasName(): boolean;
    clearName(): void;
    getName(): string | undefined;
    setName(value: string): void;

    getSettingsMap(): jspb.Map<string, string>;
    clearSettingsMap(): void;
    hasRequestid(): boolean;
    clearRequestid(): void;
    getRequestid(): string | undefined;
    setRequestid(value: string): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Connected.AsObject;
    static toObject(includeInstance: boolean, msg: Connected): Connected.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Connected, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Connected;
    static deserializeBinaryFromReader(message: Connected, reader: jspb.BinaryReader): Connected;
  }

  export namespace Connected {
    export type AsObject = {
      name?: string,
      settingsMap: Array<[string, string]>,
      requestid?: string,
    }
  }

  export enum MessageCase {
    MESSAGE_NOT_SET = 0,
    REGISTERED = 1,
    CONNECTED = 2,
  }
}

