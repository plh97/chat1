import {
  getMessageReadProgress,
  getMessageReaders,
  getRoomParticipantCount,
  isOwnMessage,
} from "./messageRead";

describe("message read state", () => {
  it("uses the message author id instead of conflicting nested profile data", () => {
    const message = {
      userId: "2",
      user: { id: "1", userId: "1" },
    };

    expect(isOwnMessage(message, { id: "1", userId: "1" })).toBe(false);
    expect(isOwnMessage(message, { id: "2", userId: "2" })).toBe(true);
  });

  it("does not treat a missing identity as an own message", () => {
    expect(isOwnMessage({ userId: "" }, { id: "" })).toBe(false);
  });

  it("excludes the sender from read progress", () => {
    const result = getMessageReadProgress(
      { userId: "1", seq: 10 },
      [{ id: 1 }, { id: 2 }],
      { "1": 10, "2": 9 }
    );

    expect(result).toEqual({
      recipientCount: 1,
      readCount: 0,
      percentage: 0,
    });
  });

  it("becomes fully read only after every recipient has read it", () => {
    const result = getMessageReadProgress(
      { userId: "1", seq: 10 },
      [{ id: "1" }, { id: "2" }, { id: "3" }],
      { "1": 10, "2": 10, "3": 10 }
    );

    expect(result).toEqual({
      recipientCount: 2,
      readCount: 2,
      percentage: 100,
    });
  });

  it("uses total room membership when no recipient has read yet", () => {
    const result = getMessageReadProgress(
      { userId: "1", seq: 10 },
      [{ id: "1" }, { id: "2" }],
      {},
      4
    );

    expect(result).toEqual({
      recipientCount: 3,
      readCount: 0,
      percentage: 0,
    });
  });

  it("counts readers that are outside the currently loaded member page", () => {
    const result = getMessageReadProgress(
      { userId: "1", seq: 10 },
      [{ id: "1" }, { id: "2" }],
      { "2": 10, "3": 10 },
      4
    );

    expect(result).toEqual({
      recipientCount: 3,
      readCount: 2,
      percentage: (2 / 3) * 100,
    });
  });

  it("returns the recipient profiles that read the message", () => {
    const readers = getMessageReaders(
      { userId: "1", seq: 10 },
      [
        { id: "1", userId: "1" },
        { id: "2", userId: "2" },
        { id: "3", userId: "3" },
      ],
      { "1": 12, "2": 10, "3": 9 }
    );

    expect(readers.map((user) => user.id)).toEqual(["2"]);
  });
});

describe("room participant count", () => {
  it("uses the authoritative participant count returned by the room API", () => {
    expect(
      getRoomParticipantCount({
        member: [{ id: "1" }, { id: "2" }],
        admin: [{ id: "1" }],
        participantTotalCount: 4002,
        memberTotalCount: 4001,
        adminTotalCount: 20,
      })
    ).toBe(4002);
  });

  it("subtracts the sender from the room API participant count", () => {
    expect(
      getMessageReadProgress(
        { userId: "2", seq: 10 },
        [{ id: "1" }, { id: "2" }, { id: "stale-user" }],
        { "1": 10, "2": 10 },
        2
      )
    ).toEqual({
      recipientCount: 1,
      readCount: 1,
      percentage: 100,
    });
  });

  it("deduplicates the creator included by member and admin totals", () => {
    expect(
      getRoomParticipantCount({
        member: [{ id: "1" }, { id: "2" }],
        admin: [{ id: "1" }, { id: "3" }],
        creator: { id: "1" },
        memberTotalCount: 5,
        adminTotalCount: 3,
      })
    ).toBe(7);
  });

  it("uses the loaded private-room members when totals are absent", () => {
    expect(
      getRoomParticipantCount({
        member: [{ id: "1" }, { id: "2" }],
        admin: [],
      })
    ).toBe(2);
  });
});
