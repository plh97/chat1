import Api from "@/Api";
import type { IMessage, IRoom, IUser } from "@/interfaces";
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
  loadRoomMoreMessageThunk,
  loadMoreMessage,
  markReadMessage,
  openMessageWindow,
  roomReducer,
  refreshRoomInfoThunk,
  updateRoomThunk,
  updateReplyMessage,
  updateSelectedMessage,
} from "./room";
import { updateLocalUserRoom, userReducer } from "./user";
import { updateUserReferences } from "./userReferences";

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

  it("keeps initial loading active between metadata and message responses", async () => {
    let resolveRoom!: (room: IRoom) => void;
    let resolveMessages!: (page: {
      message: IMessage[];
      hasMore: boolean;
    }) => void;
    (Api.getRoom as jest.Mock).mockReturnValueOnce(
      new Promise<IRoom>((resolve) => {
        resolveRoom = resolve;
      })
    );
    (Api.getRoomMessages as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMessages = resolve;
      })
    );
    const store = configureStore({
      reducer: { room: roomReducer, user: userReducer },
    });

    const request = store.dispatch(getRoomInfoThunk("room-1"));
    expect(store.getState().room.loadingMessageKind).toBe("initial");

    resolveRoom({
      id: "room-1",
      isMember: true,
      message: [],
      member: [],
    } as unknown as IRoom);
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getState().room.data.id).toBe("room-1");
    expect(store.getState().room.loadingMessageKind).toBe("initial");

    resolveMessages({ message: [], hasMore: false });
    await request;

    expect(store.getState().room.loadingMessage).toBe(false);
    expect(store.getState().room.loadingMessageKind).toBeNull();
  });

  it("clears history loading after a rejected request", async () => {
    (Api.getRoomMessages as jest.Mock).mockRejectedValueOnce(
      new Error("network failed")
    );
    const store = configureStore({
      reducer: { room: roomReducer, user: userReducer },
    });

    const result = await store.dispatch(
      loadRoomMoreMessageThunk({ id: "room-1", start: 50, pageSize: 50 })
    );

    expect(loadRoomMoreMessageThunk.rejected.match(result)).toBe(true);
    expect(store.getState().room.loadingMessage).toBe(false);
    expect(store.getState().room.loadingMessageKind).toBeNull();
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

describe("active room profile reference updates", () => {
  it("updates roles, loaded messages, replies and selected snapshots", () => {
    const oldUser = {
      id: "7",
      userId: "7",
      userName: "Old name",
      image: "old.png",
    } as IUser;
    const nestedReply = {
      id: "reply-1",
      userId: "7",
      user: { ...oldUser },
    } as IMessage;
    const message = {
      id: "message-1",
      userId: "7",
      user: { ...oldUser },
      reply: nestedReply,
    } as IMessage;
    let state = roomReducer(
      undefined,
      initialMessage({
        id: "room-1",
        member: [{ ...oldUser }],
        admin: [{ ...oldUser }],
        creator: { ...oldUser },
        peer: { ...oldUser },
        message: [message],
        lastMsg: { ...message, user: { ...oldUser } },
      })
    );
    state = roomReducer(
      state,
      updateSelectedMessage({ ...message, user: { ...oldUser } })
    );
    state = roomReducer(
      state,
      updateReplyMessage({ ...nestedReply, user: { ...oldUser } })
    );

    state = roomReducer(
      state,
      updateUserReferences({
        userId: "7",
        userName: "New name",
        image: "new.png",
      })
    );

    expect(state.data.member[0].userName).toBe("New name");
    expect(state.data.admin[0].image).toBe("new.png");
    expect(state.data.creator?.userName).toBe("New name");
    expect(state.data.peer?.image).toBe("new.png");
    expect(state.data.message[0].user.userName).toBe("New name");
    expect(state.data.message[0].reply?.user.image).toBe("new.png");
    expect(state.data.lastMsg?.user.userName).toBe("New name");
    expect(state.selectedMessage?.user.image).toBe("new.png");
    expect(state.replyMessage?.user.userName).toBe("New name");
  });
});
