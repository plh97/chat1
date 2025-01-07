import type { IUser } from "@/interfaces";
import type { MediaMessage, Message } from "db";

export interface IMediaMessage extends MediaMessage {
  file: File;
  url: string;
  // thumbnail: string | null;
  fileType: string;
  name: string;
  size: number;
  // duration: string | null;
}

export interface IMessage extends Omit<Message, "mediaMessage"> {
  mediaMessage?: IMediaMessage;
  user: IUser;
  member?: IUser[];
  reply?: IMessage;
}

export interface MessageRequest {
  pageSize?: number;
  id: string;
  start?: number;
}

export interface IAddMessageRequest {
  text: string;
  images: string[];
  user: string;
  roomId: string;
}
