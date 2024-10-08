import type { IChannelType, IContentType, MediaMessage, Message, ReadMessage, Room } from "db";
import { WebSocket, WebSocketServer } from "ws";
import { WS_EVENT } from "./constants";

export type CB = (...arg: unknown[]) => void;

export type IOnMsgReceive = (
  msg: IWsData,
  socket: WebSocket,
  ws: WebSocketServer
) => Promise<void>;

export type CHANNEL_TYPE = `room:${string}` | `userinfo:${string}`;

// export { IChannelType, IContentType } from "db";

// export type IChannelType = IChannelType;

// export enum IChannelType {
//   PRIVATE = "0",
//   GROUP = "1",
// }
// export enum IContentType {
//   TEXT_MESSAGE = "0",
//   MEDIA_MESSAGE = "1",
//   SYSTEM_MESSAGE = "2",
//   CALL_MESSAGE = "3",
//   READ_MESSAGE = "4",
//   RECALL_MESSAGE = "5",
// }

export interface ITextMessage {
  text: string;
  methion: string[];
}

export interface IMediaMessage extends MediaMessage {
  file?: File;
  extension: string;
  // url: string;
  // thumbnail?: string;
  // fileType?: string;
  // name?: string;
  // size?: number;
  // duration?: string;
}
export interface IReadMessage extends ReadMessage {
  // lastReadSeq: number;
  // operator: string;
}

export interface IMessageCore extends Message {
  // id: string;
  // user: unknown;
  createdAt: Date;
  isRead: boolean;
  seq: number;
  contentType: IContentType;
  textMessage: ITextMessage | null;
  mediaMessage: IMediaMessage | null;
  readMessage: IReadMessage | null;
  channelId: string;
}

export interface IWsData<T = any> {
  event: WS_EVENT;
  data: T;
  requestId: string;
  code: number;
}

export interface IRoomCore extends Room {
  // id?: Types.ObjectId;
  name: string;
  image: string;
  channelType: IChannelType;
  // creater: Types.ObjectId;
  admin: string[];
  member: string[];
  createdAt: Date;
  updatedAt: Date;
  message: string[];
  readSeq: Record<string, number>;
}
