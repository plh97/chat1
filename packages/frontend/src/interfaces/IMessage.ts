import type { IUser } from "@/interfaces";
import type { MediaMessage, Message } from "./chat";

export interface IMediaMessage extends MediaMessage {
  file: File;
  url: string;
  // thumbnail: string | null;
  fileType: string;
  name: string;
  size: number;
  duration: string | null;
}

export interface IMessage extends Omit<Message, "mediaMessage"> {
  mediaMessage?: IMediaMessage;
  user: IUser;
  member?: IUser[];
  reply?: IMessage;
  localStatus?: "sending" | "failed";
}

export interface MessageRequest {
  pageSize?: number;
  id: string;
  start?: number;
}

export interface MessageWindowRequest {
  pageSize?: number;
  id: string;
  roomId: string;
}

export interface MessageWindowResponse {
  message: IMessage[];
  targetId: string;
  targetIndex: number;
  totalCount: number;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
}

export interface MessageSearchResponse {
  message: IMessage[];
  totalCount: number;
}

export interface MessageCursorRequest {
  id: string;
  seq: number;
  direction: "before" | "after";
  pageSize?: number;
}

export interface MessagePageResponse {
  message: IMessage[];
  hasMore: boolean;
}

export interface IAddMessageRequest {
  text: string;
  images: string[];
  user: string;
  roomId: string;
}
