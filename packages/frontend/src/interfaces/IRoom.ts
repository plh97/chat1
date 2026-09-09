import type { Room } from "./chat";
import type { IMessage, IUser } from "@/interfaces";

export interface IRoom extends Omit<Room, "member" | "message"> {
  // name: string;
  // image: string;
  isMember?: boolean;
  member: IUser[];
  admin: IUser[];
  peer?: IUser;
  memberTotalCount?: number;
  adminTotalCount?: number;
  hasMoreMessage?: boolean;
  // createdAt: Date;
  // updatedAt: Date;
  totalCount: number;
  message: IMessage[];
  lastMsg?: IMessage;
}
