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

export interface RoomUpdateRequest {
  id: string;
  name?: string;
  image?: string | null;
  /** Existing fields add users to a role; they do not replace the full list. */
  memberId?: string[];
  adminId?: string[];
  /** Remove ordinary members from the room. */
  removeMemberIds?: string[];
  /** Revoke admin privileges and keep the users as ordinary members. */
  removeAdminIds?: string[];
  /** Transfer ownership to an existing room participant. */
  newCreatorId?: string;
}
