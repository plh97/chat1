import type { Room } from "./chat";
import type { IMessage, IUser } from "@/interfaces";

export interface IRoom extends Omit<Room, "member" | "message"> {
  // name: string;
  // image: string;
  isMember?: boolean;
  member: IUser[];
  admin: IUser[];
  creator?: IUser;
  peer?: IUser;
  memberTotalCount?: number;
  adminTotalCount?: number;
  participantTotalCount?: number;
  hasMoreMessage?: boolean;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
  messageWindowMode?: boolean;
  // createdAt: Date;
  // updatedAt: Date;
  totalCount: number;
  message: IMessage[];
  lastMsg?: IMessage;
}
