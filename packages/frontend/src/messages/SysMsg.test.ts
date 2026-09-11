import type { IRoom, IUser } from "@/interfaces";
import { formatSystemMessage, replaceUserIds } from "./SysMsg";

const person = (id: string, userName: string) =>
  ({ id, userId: id, userName }) as IUser;

describe("system message user names", () => {
  it("replaces complete IDs without confusing 1 and 11", () => {
    expect(
      replaceUserIds("1 added 11, but 111 stayed", {
        "1": "One",
        "11": "Eleven",
      })
    ).toBe("One added Eleven, but 111 stayed");
  });

  it("resolves member, admin, and creator names and labels the viewer", () => {
    const room = {
      member: [person("11", "Member")],
      admin: [person("12", "Admin")],
      creator: person("13", "Owner"),
    } as IRoom;

    expect(
      formatSystemMessage(
        "13 made 12 an administrator and added 11; 99 watched",
        room,
        "11"
      )
    ).toBe("Owner made Admin an administrator and added You; 99 watched");
  });

  it("only replaces the actor ID in room-name change messages", () => {
    const room = {
      member: [person("11", "Member")],
    } as IRoom;

    expect(
      formatSystemMessage(
        '11 changed the room name from "room 11" to "team 11"',
        room,
        "11",
        "CHANGE_ROOM"
      )
    ).toBe('You changed the room name from "room 11" to "team 11"');
  });
});
