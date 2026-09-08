import type { IRoom, IUser } from "@/interfaces";
import { getRoomDisplay } from "./roomDisplay";

const createUser = (id: string, userName: string, image = "") =>
  ({ id, userName, image }) as IUser;

const createRoom = (overrides: Partial<IRoom> = {}) =>
  ({
    id: "10",
    name: "Private Chat",
    image: "room.png",
    channelType: "PRIVATE",
    member: [],
    ...overrides,
  }) as IRoom;

describe("getRoomDisplay", () => {
  it("uses the private peer summary for the name and avatar", () => {
    const peer = createUser("2", "fake-1", "peer.png");

    expect(getRoomDisplay(createRoom({ peer }), "1")).toEqual({
      name: "fake-1",
      image: "peer.png",
      profile: peer,
    });
  });

  it("falls back to the other loaded member", () => {
    const me = createUser("1", "me", "me.png");
    const peer = createUser("2", "fake-1", "peer.png");

    expect(getRoomDisplay(createRoom({ member: [me, peer] }), "1")).toEqual({
      name: "fake-1",
      image: "peer.png",
      profile: peer,
    });
  });

  it("ignores an invalid peer summary that points to the current user", () => {
    const me = createUser("1", "me", "me.png");
    const peer = createUser("2", "fake-1", "peer.png");

    expect(
      getRoomDisplay(createRoom({ peer: me, member: [me, peer] }), "1")
    ).toEqual({
      name: "fake-1",
      image: "peer.png",
      profile: peer,
    });
  });

  it("uses the peer name fallback when the peer has no avatar", () => {
    const peer = createUser("2", "fake-1");

    expect(getRoomDisplay(createRoom({ peer }), "1")).toEqual({
      name: "fake-1",
      image: "",
      profile: peer,
    });
  });
});
