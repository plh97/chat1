import type { IMessage, IRoom, IUser } from "@/interfaces";
import { configureStore } from "@reduxjs/toolkit";

jest.mock("@/Api", () => ({
  __esModule: true,
  default: {
    setMyUserInfo: jest.fn(),
  },
}));
jest.mock("@/utils/uploadFile", () => ({
  uploadFileWithPresignedUrl: jest.fn(),
}));

import Api from "@/Api";
import { uploadFileWithPresignedUrl } from "@/utils/uploadFile";

import {
  setLocalUserInfo,
  setUserInfoThunk,
  shiftRoom,
  topUserRoom,
  uploadImageThunk,
  updateLocalUserRoom,
  updateUserRoomReadSeq,
  userReducer,
} from "./user";
import { updateUserReferences } from "./userReferences";

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

  it("updates room metadata in place without changing sidebar order", () => {
    const otherRoom = { ...room, id: "20", name: "Other" } as IRoom;
    const initialState = userReducer(
      undefined,
      setLocalUserInfo({
        id: "1",
        userId: "1",
        room: [otherRoom, room],
      })
    );

    const state = userReducer(
      initialState,
      updateLocalUserRoom({ ...room, name: "Renamed" } as IRoom)
    );

    expect(state.data.room?.map((entry) => entry.id)).toEqual(["20", "10"]);
    expect(state.data.room?.[1].name).toBe("Renamed");
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

const profile = (id: string, userName: string, image = `${id}-old.png`) =>
  ({
    id,
    userId: id,
    userName,
    image,
  }) as IUser;

describe("user profile reference updates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates the current user and every sidebar user snapshot", () => {
    const target = profile("1", "Old name");
    const other = profile("2", "Other user");
    const reply = {
      id: "reply-1",
      userId: "1",
      user: { ...target },
    } as IMessage;
    const message = {
      id: "message-1",
      userId: "1",
      user: { ...target },
      reply,
    } as IMessage;
    const profileRoom = {
      id: "room-1",
      member: [{ ...target }, other],
      admin: [{ ...target }],
      creator: { ...target },
      peer: { ...target },
      message: [message],
      lastMsg: {
        id: "last-1",
        userId: "1",
        user: { ...target },
        reply: { ...reply, user: { ...target } },
      },
    } as IRoom;
    let state = userReducer(
      undefined,
      setLocalUserInfo({
        ...target,
        friend: [{ ...target }, other],
        room: [profileRoom],
      })
    );

    state = userReducer(
      state,
      updateUserReferences({
        id: "1",
        userName: "New name",
        image: "new.png",
      })
    );

    expect(state.data.userName).toBe("New name");
    expect(state.data.image).toBe("new.png");
    expect(state.data.friend?.[0].userName).toBe("New name");
    expect(state.data.friend?.[1].userName).toBe("Other user");
    expect(state.data.room?.[0].member[0].userName).toBe("New name");
    expect(state.data.room?.[0].admin[0].image).toBe("new.png");
    expect(state.data.room?.[0].creator?.userName).toBe("New name");
    expect(state.data.room?.[0].peer?.image).toBe("new.png");
    expect(state.data.room?.[0].message[0].user.userName).toBe("New name");
    expect(state.data.room?.[0].message[0].reply?.user.image).toBe("new.png");
    expect(state.data.room?.[0].lastMsg?.user.userName).toBe("New name");
    expect(state.data.room?.[0].lastMsg?.reply?.user.image).toBe("new.png");
    expect(state.profileUpdates["1"]).toEqual(
      expect.objectContaining({ userName: "New name", image: "new.png" })
    );
  });

  it("uses the saved API response and keeps omitted fields unchanged", async () => {
    (Api.setMyUserInfo as jest.Mock).mockResolvedValue({
      id: "1",
      userId: "1",
      userName: "Server name",
    });
    const store = configureStore({ reducer: { user: userReducer } });
    store.dispatch(
      setLocalUserInfo({
        id: "1",
        userId: "1",
        userName: "Old name",
        image: "keep.png",
      })
    );

    await store.dispatch(setUserInfoThunk({ userName: "Submitted name" }));

    expect(Api.setMyUserInfo).toHaveBeenCalledWith({
      userName: "Submitted name",
    });
    expect(store.getState().user.data.userName).toBe("Server name");
    expect(store.getState().user.data.image).toBe("keep.png");
  });

  it("persists an uploaded avatar before updating every local reference", async () => {
    (uploadFileWithPresignedUrl as jest.Mock).mockResolvedValue(
      "https://cdn.example/new.png"
    );
    (Api.setMyUserInfo as jest.Mock).mockResolvedValue({
      id: "1",
      userId: "1",
      userName: "Current name",
      image: "https://cdn.example/new.png",
    });
    const store = configureStore({ reducer: { user: userReducer } });
    store.dispatch(
      setLocalUserInfo({
        id: "1",
        userId: "1",
        userName: "Current name",
        image: "old.png",
      })
    );
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    await store.dispatch(uploadImageThunk({ file, updateUserImage: true }));

    expect(uploadFileWithPresignedUrl).toHaveBeenCalledWith(file, 1);
    expect(Api.setMyUserInfo).toHaveBeenCalledWith({
      image: "https://cdn.example/new.png",
    });
    expect(store.getState().user.data.image).toBe(
      "https://cdn.example/new.png"
    );
  });
});
