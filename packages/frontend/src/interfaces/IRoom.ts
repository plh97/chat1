import type { Room } from "db";
import type { IMessage, IUser } from "@/interfaces";

export interface IRoom extends Omit<Room, "member" | "message"> {
  // name: string;
  // image: string;
  member: IUser[];
  admin: IUser[];
  // createdAt: Date;
  // updatedAt: Date;
  totalCount: 0;
  message: IMessage[];
  lastMsg?: IMessage;
}
