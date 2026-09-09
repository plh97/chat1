import type { IMessage, IRoom } from "@/interfaces";

jest.mock("@/Api", () => ({
  __esModule: true,
  default: {},
}));

import {
  setLocalUserInfo,
  shiftRoom,
  topUserRoom,
  updateUserRoomReadSeq,
  userReducer,
} from "./user";

const room = {
  id: "10",
  readSeq: { "1": 5 },
  unreadCount: 2,
} as IRoom;

const createState = () =>
  userReducer(
    undefined,
    setLocalUserInfo({
      id: "1",
      userId: "1",
      room: [room],
    })
  );

describe("user room unread count", () => {
  it("upserts a pushed room without duplicating it", () => {
    const state = userReducer(
      createState(),
      shiftRoom({ ...room, name: "Updated room" } as IRoom)
    );

    expect(state.data.room).toHaveLength(1);
    expect(state.data.room?.[0].name).toBe("Updated room");
  });

  it("moves the active room to the top and updates its preview", () => {
    const otherRoom = {
      ...room,
      id: "20",
      unreadCount: 0,
      lastMsg: undefined,
    } as IRoom;
    const initialState = userReducer(
      undefined,
      setLocalUserInfo({
        id: "1",
        userId: "1",
        room: [room, otherRoom],
      })
    );
    const message = {
      id: "message-7",
      channelId: "20",
      userId: "2",
      seq: 7,
      contentType: "TEXT_MESSAGE",
      textMessage: { text: "latest preview", mention: [] },
    } as IMessage;

    const state = userReducer(initialState, topUserRoom(message));

    expect(state.data.room?.map((entry) => entry.id)).toEqual(["20", "10"]);
    expect(state.data.room?.[0].lastMsg).toEqual(message);
  });

  it("does not increase when the current user sends a message", () => {
    const state = userReducer(
      createState(),
      topUserRoom({
        id: "message-6",
        channelId: "10",
        userId: "1",
        seq: 6,
      } as IMessage)
    );

    expect(state.data.room?.[0].unreadCount).toBe(2);
  });

  it("increases when another user sends a message", () => {
    const state = userReducer(
      createState(),
      topUserRoom({
        id: "message-6",
        channelId: "10",
        userId: "2",
        seq: 6,
      } as IMessage)
    );

    expect(state.data.room?.[0].unreadCount).toBe(3);
  });

  it("clears when the current user reads the room", () => {
    const state = userReducer(
      createState(),
      updateUserRoomReadSeq({
        channelId: "10",
        readMessage: {
          operator: "1",
          lastReadSeq: 6,
          readSeq: { "1": 6 },
        },
      })
    );

    expect(state.data.room?.[0].readSeq["1"]).toBe(6);
    expect(state.data.room?.[0].unreadCount).toBe(0);
  });

  it("does not regress when read events arrive out of order", () => {
    let state = userReducer(
      createState(),
      updateUserRoomReadSeq({
        channelId: "10",
        readMessage: {
          operator: "2",
          lastReadSeq: 17,
          readSeq: { "2": 17 },
        },
      })
    );

    state = userReducer(
      state,
      updateUserRoomReadSeq({
        channelId: "10",
        readMessage: {
          operator: "2",
          lastReadSeq: 11,
          readSeq: { "2": 11 },
        },
      })
    );

    expect(state.data.room?.[0].readSeq["2"]).toBe(17);
  });
});
