import { IMessage as IMessageCore, IRoom as IRoomCore } from "@chatroom/core";
import { USER } from "./IUser";

export interface IMessage extends Omit<IMessageCore, '_id'> {
  user: USER;
  _id: string;
}


export interface IMessage extends Omit<IMessageCore, '_id'> {
  user: USER;
  _id: string;
}

export interface MESSAGE_RESPONSE extends Omit<IRoomCore, "message" | "member" | '_id'> {
  _id: string;
  message: IMessage[];
  member: USER[];
  totalCount: number;
}

export interface IRoom extends Omit<IRoomCore, "message" | "member" | '_id'> {
  _id: string;
  message: IMessage[];
  member: USER[];
  totalCount: number;
  lastMsg: IMessage;
}

export interface MESSAGE_REQUEST {
  pageSize?: number;
  _id: string;
  start?: number;
}

export interface ADD_MESSAGE_REQUEST {
  text: string;
  images: string[];
  user: string;
  roomId: string;
}
