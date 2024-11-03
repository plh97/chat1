import type { MediaMessage, Message, Room, User } from "db";
import { IUser } from "./";

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
  user: User;
  member?: IUser[];
}

export interface MESSAGE_RESPONSE
  extends Omit<Room, "message" | "member" | "id"> {
  id: string;
  message: IMessage[];
  member: IUser[];
  totalCount: number;
}

// export interface IRoom extends Omit<Room, "message" | "member" | "id"> {
//   id: string;
//   message: IMessage[];
//   member: IUser[];
//   totalCount: number;
//   lastMsg?: IMessage;
// }

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
