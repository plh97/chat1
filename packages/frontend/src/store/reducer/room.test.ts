import Api from "@/Api";
import type { IMessage, IRoom } from "@/interfaces";

jest.mock("@/Api", () => ({
  __esModule: true,
  default: {
    updateRoom: jest.fn(),
  },
}));

import {
  changeRoomId,
  appendMoreMessage,
  initialMessage,
  loadMoreMessage,
  markReadMessage,
  openMessageWindow,
  roomReducer,
  updateRoomThunk,
} from "./room";

describe("updateRoomThunk", () => {
  it("preserves the active message window when room metadata is updated", async () => {
    const message = [{ id: "message-1", seq: 1 }] as IMessage[];
    const updatedRoom = {
      id: "room-1",
      name: "Updated room",
      message: [],
      totalCount: 0,
    } as IRoom;
    (Api.updateRoom as jest.Mock).mockResolvedValue(updatedRoom);

    const dispatch = jest.fn();
    const getState = () => ({
      room: {
        data: {
          message,
          totalCount: 42,
          hasMoreMessage: true,
        },
      },
    });

    await (updateRoomThunk({ id: "room-1", name: "Updated room" }) as any)(
      dispatch,
      getState
    );

    expect(dispatch).toHaveBeenCalledWith(
      initialMessage({
        ...updatedRoom,
        message,
        totalCount: 42,
        hasMoreMessage: true,
      })
    );
  });
});

describe("room read sequence", () => {
  it("does not regress when read events arrive out of order", () => {
    let state = roomReducer(undefined, changeRoomId("room-1"));
    state = roomReducer(
      state,
      initialMessage({ id: "room-1", readSeq: { "2": 17 } })
    );

    state = roomReducer(
      state,
      markReadMessage({ id: "room-1", readSeq: { "2": 11 } })
    );

    expect(state.data.readSeq["2"]).toBe(17);
  });
});

describe("message search window", () => {
  it("opens a middle window and extends it in both directions", () => {
    let state = roomReducer(
      undefined,
      openMessageWindow({
        message: [
          { id: "100", seq: 100 },
          { id: "101", seq: 101 },
        ] as IMessage[],
        targetId: "101",
        targetIndex: 100,
        totalCount: 20_000,
        hasMoreBefore: true,
        hasMoreAfter: true,
      })
    );

    state = roomReducer(
      state,
      loadMoreMessage([{ id: "99", seq: 99 }] as IMessage[])
    );
    state = roomReducer(
      state,
      appendMoreMessage([{ id: "102", seq: 102 }] as IMessage[])
    );

    expect(state.data.message.map((message) => message.seq)).toEqual([
      99, 100, 101, 102,
    ]);
    expect(state.data.messageWindowMode).toBe(true);
    expect(state.data.hasMoreBefore).toBe(true);
    expect(state.data.hasMoreAfter).toBe(true);
  });
});
