import { IMessage, IRoom } from "@chatroom/core";
import { USER } from "./IUser";

export interface ROOM extends Omit<IRoom, 'member' | 'message'> {
  name: string;
  image: string;
  member: USER[];
  manager: USER[];
  createdAt: Date;
  updatedAt: Date;
  message: IMessage[];
  lastMsg?: IMessage;
}
