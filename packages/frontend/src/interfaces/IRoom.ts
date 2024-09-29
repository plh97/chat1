import { IMessageCore, IRoomCore } from "core";
import { USER } from "./IUser";

export interface ROOM extends Omit<IRoomCore, "member" | "message"> {
  name: string;
  image: string;
  member: USER[];
  manager: USER[];
  createdAt: Date;
  updatedAt: Date;
  message: IMessageCore[];
  lastMsg?: IMessageCore;
}
