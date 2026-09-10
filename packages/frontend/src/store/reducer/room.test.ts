import Api from "@/Api";
import type { IMessage, IRoom } from "@/interfaces";
import { configureStore } from "@reduxjs/toolkit";

jest.mock("@/Api", () => ({
  __esModule: true,
  default: {
    getMyUserInfo: jest.fn(),
    getRoom: jest.fn(),
    getRoomMessages: jest.fn(),
    joinRoom: jest.fn(),
    updateRoom: jest.fn(),
  },
}));

import {
  changeRoomId,
  getRoomInfoThunk,
  appendMoreMessage,
  initialMessage,
  joinRoomThunk,
  loadMoreMessage,
  markReadMessage,
  openMessageWindow,
  roomReducer,
  refreshRoomInfoThunk,
  updateRoomThunk,
} from "./room";
import { updateLocalUserRoom, userReducer } from "./user";

beforeEach(() => {
  jest.clearAllMocks();
});

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

    const updateRequest = {
      id: "room-1",
      name: "Updated room",
      removeMemberIds: ["3"],
      removeAdminIds: ["2"],
      newCreatorId: "4",
    };
    const result = await (updateRoomThunk(updateRequest) as any)(
      dispatch,
      getState
    );

    expect(Api.updateRoom).toHaveBeenCalledWith(updateRequest);
    expect(result).toBe(updatedRoom);

    expect(dispatch).toHaveBeenCalledWith(
      initialMessage({
        ...updatedRoom,
        message,
        totalCount: 42,
        hasMoreMessage: true,
      })
    );
    expect(dispatch).toHaveBeenCalledWith(updateLocalUserRoom(updatedRoom));
  });
});

describe("room detail refresh", () => {
  it("preserves a searched message window while refreshing metadata", async () => {
    const messages = [{ id: "message-100", seq: 100 }] as IMessage[];
    const freshRoom = {
      id: "room-1",
      name: "Fresh name",
      message: [],
      totalCount: 0,
      isMember: false,
    } as IRoom;
    (Api.getRoom as jest.Mock).mockResolvedValue(freshRoom);
    const currentRoom = {
      id: "room-1",
      message: messages,
      totalCount: 20_000,
      hasMoreMessage: true,
      hasMoreBefore: true,
      hasMoreAfter: true,
      messageWindowMode: true,
    } as IRoom;
    const dispatch = jest.fn();

    await (refreshRoomInfoThunk("room-1") as any)(dispatch, () => ({
      room: { data: currentRoom },
    }));

    expect(dispatch).toHaveBeenCalledWith(
      initialMessage({
        ...freshRoom,
        message: messages,
        totalCount: 20_000,
        hasMoreMessage: true,
        hasMoreBefore: true,
        hasMoreAfter: true,
        messageWindowMode: true,
      })
    );
    expect(dispatch).toHaveBeenCalledWith(updateLocalUserRoom(freshRoom));
  });

  it("does not request protected history for a public-room outsider", async () => {
    const outsiderRoom = {
      id: "public-room",
      isMember: false,
      message: [],
      totalCount: 0,
    } as IRoom;
    (Api.getRoom as jest.Mock).mockResolvedValue(outsiderRoom);
    const store = configureStore({
      reducer: { room: roomReducer, user: userReducer },
    });

    await store.dispatch(getRoomInfoThunk("public-room"));

    expect(Api.getRoomMessages).not.toHaveBeenCalled();
    expect(store.getState().room.loadingMessage).toBe(false);
    expect(store.getState().room.data.isMember).toBe(false);
    expect(store.getState().room.data.hasMoreMessage).toBe(false);
  });

  it("actively reloads room history after joining", async () => {
    const joinedRoom = {
      id: "public-room",
      isMember: true,
      message: [],
      totalCount: 0,
    } as IRoom;
    (Api.joinRoom as jest.Mock).mockResolvedValue(joinedRoom);
    (Api.getMyUserInfo as jest.Mock).mockResolvedValue({ room: [joinedRoom] });
    (Api.getRoom as jest.Mock).mockResolvedValue(joinedRoom);
    (Api.getRoomMessages as jest.Mock).mockResolvedValue({
      message: [{ id: "joined-message", seq: 1 }],
      hasMore: false,
    });
    const store = configureStore({
      reducer: { room: roomReducer, user: userReducer },
    });

    await store.dispatch(joinRoomThunk({ id: "public-room" }));

    expect(Api.joinRoom).toHaveBeenCalledWith({ id: "public-room" });
    expect(Api.getRoomMessages).toHaveBeenCalledWith({
      pageSize: 50,
      id: "public-room",
    });
    expect(store.getState().room.data.message).toEqual([
      expect.objectContaining({ id: "joined-message" }),
    ]);
    expect(store.getState().room.loadingMessage).toBe(false);
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
