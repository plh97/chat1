import type { Room } from "@/db";
import type { IMessage, IUser } from "@/interfaces";

export interface IRoom extends Omit<Room, "member" | "message"> {
  // name: string;
  // image: string;
  isMember?: boolean;
  member: IUser[];
  admin: IUser[];
  memberTotalCount?: number;
  adminTotalCount?: number;
  hasMoreMessage?: boolean;
  // createdAt: Date;
  // updatedAt: Date;
  totalCount: 0;
  message: IMessage[];
  lastMsg?: IMessage;
}
