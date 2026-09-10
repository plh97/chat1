import type { IRoom, IUser } from "@/interfaces";
import {
  buildRoomManagementUpdate,
  getRoomManagementPermissions,
} from "./roomManagement";

const user = (id: string) => ({ id }) as IUser;

const room = {
  creatorId: "1",
  creator: user("1"),
  adminId: ["2"],
  admin: [user("2")],
} as IRoom;

describe("getRoomManagementPermissions", () => {
  it("allows the creator to manage every room role", () => {
    expect(getRoomManagementPermissions(room, "1")).toEqual({
      isCreator: true,
      isAdmin: false,
      canEditRoom: true,
      canManageMembers: true,
      canManageAdmins: true,
      canTransferOwnership: true,
    });
  });

  it("allows an admin to edit the room and remove ordinary members only", () => {
    expect(getRoomManagementPermissions(room, "2")).toEqual({
      isCreator: false,
      isAdmin: true,
      canEditRoom: true,
      canManageMembers: true,
      canManageAdmins: false,
      canTransferOwnership: false,
    });
  });

  it("keeps ordinary members in read-only mode", () => {
    expect(getRoomManagementPermissions(room, "3")).toEqual({
      isCreator: false,
      isAdmin: false,
      canEditRoom: false,
      canManageMembers: false,
      canManageAdmins: false,
      canTransferOwnership: false,
    });
  });

  it("can derive admin permission from a normalized admin list", () => {
    expect(
      getRoomManagementPermissions(
        { ...room, adminId: [], admin: [user("9")] },
        "9"
      ).isAdmin
    ).toBe(true);
  });
});

describe("buildRoomManagementUpdate", () => {
  it.each([
    ["remove-member", { id: "7", removeMemberIds: ["3"] }],
    ["remove-admin", { id: "7", removeAdminIds: ["3"] }],
    ["transfer-owner", { id: "7", newCreatorId: "3" }],
  ] as const)("maps %s to the backend mutation fields", (type, expected) => {
    expect(
      buildRoomManagementUpdate("7", {
        type,
        user: user("3"),
      })
    ).toEqual(expected);
  });
});
