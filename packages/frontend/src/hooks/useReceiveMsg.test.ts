import { act, renderHook } from "@testing-library/react";
import { WS_EVENT } from "@/core";
import type { IMessage, IRoom } from "@/interfaces";

const mockFetchUserInfoThunk = jest.fn(() => ({ type: "user/refresh" }));
const mockRefreshRoomInfoThunk = jest.fn((id: string) => ({
  type: "room/refresh",
  payload: id,
}));

jest.mock("@/Api", () => ({
  normalizeMessage: (message: IMessage) => message,
}));

jest.mock("@/store/reducer/user", () => ({
  fetchUserInfoThunk: () => mockFetchUserInfoThunk(),
  topUserRoom: (payload: IMessage) => ({ type: "user/top", payload }),
  updateUserLastMsg: (payload: IMessage) => ({
    type: "user/last-message",
    payload,
  }),
  updateUserRoomReadSeq: (payload: IMessage) => ({
    type: "user/read",
    payload,
  }),
}));

jest.mock("@/store/reducer/room", () => ({
  addMessage: (payload: IMessage) => ({ type: "room/add", payload }),
  initialMessage: (payload: Partial<IRoom>) => ({
    type: "room/initial",
    payload,
  }),
  markReadMessage: (payload: unknown) => ({ type: "room/read", payload }),
  recallExistMessage: (payload: IMessage) => ({
    type: "room/recall",
    payload,
  }),
  refreshRoomInfoThunk: (id: string) => mockRefreshRoomInfoThunk(id),
  scrollToEnd: (payload: boolean) => ({ type: "room/scroll", payload }),
}));

import { isRoomDetailAction, useReceiveMsg } from "./useReceiveMsg";

describe("useReceiveMsg room synchronization", () => {
  const handlers = new Map<WS_EVENT, (data?: unknown) => Promise<void>>();
  const dispatch = jest.fn((action) => Promise.resolve(action));

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    handlers.clear();
    (global as any).useAppDispatch = () => dispatch;
    (global as any).useEventListener = (
      event: WS_EVENT,
      handler: (data?: unknown) => Promise<void>
    ) => handlers.set(event, handler);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    "ADD_MEMBER",
    "REMOVE_MEMBER",
    "ADD_ADMIN",
    "REMOVE_ADMIN",
    "CHANGE_ROOM",
    "UPDATE_ROOM",
    "TRANSFER_OWNER",
  ] as const)("recognizes %s as a room-detail action", (action) => {
    expect(isRoomDetailAction(action)).toBe(true);
  });

  it("refreshes current-room metadata without inspecting system text", async () => {
    renderHook(() => useReceiveMsg({ current: { id: "7" } as IRoom }));
    const onMessage = handlers.get(WS_EVENT.SEND_MSG)!;

    await act(async () => {
      await onMessage({
        data: {
          id: "100",
          channelId: "7",
          contentType: "SYSTEM_MESSAGE",
          systemMessage: {
            actionType: "REMOVE_ADMIN",
            content: "text without the viewer id",
          },
        } as IMessage,
      });
      jest.advanceTimersByTime(50);
    });

    expect(mockRefreshRoomInfoThunk).toHaveBeenCalledWith("7");
    expect(mockFetchUserInfoThunk).not.toHaveBeenCalled();
  });

  it("refreshes the profile and active room on ROOM_LIST_CHANGED", async () => {
    renderHook(() => useReceiveMsg({ current: { id: "7" } as IRoom }));

    await act(async () => {
      await handlers.get(WS_EVENT.ROOM_LIST_CHANGED)!();
    });

    expect(mockFetchUserInfoThunk).toHaveBeenCalledTimes(1);
    expect(mockRefreshRoomInfoThunk).toHaveBeenCalledWith("7");
  });
});
