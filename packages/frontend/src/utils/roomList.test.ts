import { isRoomListLoading, sortRoomsByActivity } from "./roomList";

describe("isRoomListLoading", () => {
  it("keeps the skeleton visible while authentication is unresolved", () => {
    expect(isRoomListLoading(null, "")).toBe(true);
    expect(isRoomListLoading(null, [])).toBe(true);
  });

  it("keeps the skeleton visible while redirecting an unauthenticated user", () => {
    expect(isRoomListLoading(false, "1")).toBe(true);
  });

  it("shows room content after the authenticated profile is available", () => {
    expect(isRoomListLoading(true, "1")).toBe(false);
  });
});

describe("sortRoomsByActivity", () => {
  it("sorts rooms with the newest message first", () => {
    const rooms = [
      {
        id: "old",
        updatedAt: "2026-01-03T00:00:00Z",
        lastMsg: { createdAt: "2026-01-01T00:00:00Z" },
      },
      {
        id: "empty",
        updatedAt: "2026-01-04T00:00:00Z",
      },
      {
        id: "new",
        updatedAt: "2026-01-02T00:00:00Z",
        lastMsg: { createdAt: "2026-01-05T00:00:00Z" },
      },
    ];

    expect(sortRoomsByActivity(rooms).map((room) => room.id)).toEqual([
      "new",
      "old",
      "empty",
    ]);
  });

  it("does not mutate the original room list", () => {
    const rooms = [
      { id: "old", updatedAt: "2026-01-01T00:00:00Z" },
      { id: "new", updatedAt: "2026-01-02T00:00:00Z" },
    ];

    sortRoomsByActivity(rooms);

    expect(rooms.map((room) => room.id)).toEqual(["old", "new"]);
  });
});
