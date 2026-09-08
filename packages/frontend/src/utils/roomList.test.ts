import { isRoomListLoading } from "./roomList";

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
