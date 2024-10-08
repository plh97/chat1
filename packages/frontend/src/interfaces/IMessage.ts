import { MediaMessage, Message, Room } from "db";
import { USER } from "./IUser";

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
}

export interface MESSAGE_RESPONSE
  extends Omit<Room, "message" | "member" | "id"> {
  id: string;
  message: IMessage[];
  member: USER[];
  totalCount: number;
}

export interface IRoom extends Omit<Room, "message" | "member" | "id"> {
  id: string;
  message: IMessage[];
  member: USER[];
  totalCount: number;
  lastMsg?: IMessage;
}

export interface MESSAGE_REQUEST {
  pageSize?: number;
  id: string;
  start?: number;
}

export interface ADD_MESSAGE_REQUEST {
  text: string;
  images: string[];
  user: string;
  roomId: string;
}
