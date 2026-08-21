import type {
  ChannelType,
  ContentType,
  MediaMessage,
  Message,
  ReadMessage,
  RecallMessage,
  Room,
} from "@/db";
import { WebSocket, WebSocketServer } from "ws";
import { WS_EVENT } from "./constants";

export type CB = (...arg: unknown[]) => void;

export type IOnMsgReceive = (
  msg: IWsData,
  ws: WebSocketServer,
  socket?: WebSocket
) => Promise<void>;

export type CHANNEL_TYPE = `room:${string}` | `userinfo:${string}`;

export interface ITextMessage {
  text: string;
  mention: string[];
}

export interface IMediaMessage extends MediaMessage {
  file?: File;
  extension: string;
  url: string;
  thumbnail?: string;
  // fileType?: string;
  name?: string;
  size?: number;
  duration?: string;
}
export interface IReadMessage extends ReadMessage {
  // lastReadSeq: number;
  // operator: string;
}

export interface IRecallMessage extends RecallMessage {}

export interface IMessageCore extends Message {
  // id: string;
  // user: unknown;
  createdAt: Date;
  isRead: boolean;
  seq: number;
  contentType: ContentType;
  textMessage: ITextMessage | null;
  mediaMessage: IMediaMessage | null;
  readMessage: IReadMessage | null;
  channelId: string;
}

export interface IWsData<T = any> {
  event: WS_EVENT;
  data: T;
  requestId: string;
  message: string;
  code: number;
}

export interface IRoomCore extends Room {
  // id?: Types.ObjectId;
  name: string;
  image: string;
  channelType: ChannelType;
  // creator: Types.ObjectId;
  admin: string[];
  member: string[];
  createdAt: Date;
  updatedAt: Date;
  message: string[];
  readSeq: Record<string, number>;
}
