import type { IRoom, IUser, RoomUpdateRequest } from "@/interfaces";

const toId = (value: unknown) => String(value ?? "");

export interface RoomManagementPermissions {
  isCreator: boolean;
  isAdmin: boolean;
  canEditRoom: boolean;
  canManageMembers: boolean;
  canManageAdmins: boolean;
  canTransferOwnership: boolean;
}

export type RoomManagementAction =
  | { type: "remove-member"; user: IUser }
  | { type: "remove-admin"; user: IUser }
  | { type: "transfer-owner"; user: IUser };

export function getRoomManagementPermissions(
  room: Pick<IRoom, "creator" | "creatorId" | "admin" | "adminId">,
  currentUserId: string
): RoomManagementPermissions {
  const userId = toId(currentUserId);
  const creatorId = toId(room.creator?.id ?? room.creatorId);
  const adminIds = new Set([
    ...(room.adminId ?? []).map(toId),
    ...(room.admin ?? []).map((admin) => toId(admin.id)),
  ]);
  const isCreator = Boolean(userId) && userId === creatorId;
  const isAdmin = Boolean(userId) && !isCreator && adminIds.has(userId);

  return {
    isCreator,
    isAdmin,
    canEditRoom: isCreator || isAdmin,
    canManageMembers: isCreator || isAdmin,
    canManageAdmins: isCreator,
    canTransferOwnership: isCreator,
  };
}

export function buildRoomManagementUpdate(
  roomId: string,
  action: RoomManagementAction
): RoomUpdateRequest {
  const userId = toId(action.user.id);
  switch (action.type) {
    case "remove-member":
      return { id: roomId, removeMemberIds: [userId] };
    case "remove-admin":
      return { id: roomId, removeAdminIds: [userId] };
    case "transfer-owner":
      return { id: roomId, newCreatorId: userId };
  }
}
