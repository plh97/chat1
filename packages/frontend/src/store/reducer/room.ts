import type { Room } from "@/interfaces/chat";
import Api from "@/Api";
import { AppThunk } from "@/hooks/app";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  IMessage,
  MessageCursorRequest,
  MessageRequest,
  MessageWindowRequest,
  MessageWindowResponse,
  IRoom,
} from "@/interfaces";
import { fetchUserInfoThunk, shiftRoom } from "./user";
import { IReadMessage } from "@/core";
import { mergeReadSeqForward } from "./readSeq";

export interface IState {
  id: string;
  scrollToEnd?: number;
  scrollToTop?: number;
  error: string | null;
  data: IRoom;
  loadingMessage: boolean;
  selectedMessage?: IMessage;
  replyMessage?: IMessage;
}

const initialState: IState = {
  id: "", // room id
  scrollToEnd: undefined,
  scrollToTop: undefined,
  loadingMessage: false,
  error: null,
  data: {
    id: "",
    message: [],
    hasMoreMessage: true,
    totalCount: 0,
    image: "",
    name: "",
    member: [],
    memberId: [],
    channelType: "PRIVATE",
    // lastMsg?: {},
    creatorId: "",
    adminId: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    readSeq: {},
    admin: [],
  },
  selectedMessage: undefined,
};

// 加载房间基本信息
export const getRoomInfoThunk = createAsyncThunk<void, string>(
  `fetchRoomInfo`,
  async (id, { dispatch }) => {
    // 修改当前面room id
    dispatch(changeRoomId(id));
    // 加载中
    dispatch(changeLoading(true));
    // 获取当前房间基本信息
    const res = await Api.getRoom({
      id: id,
    });
    // 将当前房间基本信息存到store里面
    dispatch(initialMessage(res));
    const messagePage = await Api.getRoomMessages({
      pageSize: 50,
      id,
    });
    dispatch(
      initialMessage({
        message: messagePage.message,
        hasMoreMessage: messagePage.hasMore,
        hasMoreBefore: messagePage.hasMore,
        hasMoreAfter: false,
        messageWindowMode: false,
      })
    );
    // 加载结束
    dispatch(changeLoading(false));
    // div元素撑开后，滚动到底部
    dispatch(scrollToEnd(true));
  }
);
// 加载更多消息
export const loadRoomMoreMessageThunk = createAsyncThunk<
  { message: IMessage[]; hasMore: boolean },
  MessageRequest
>(`loadRoomMoreMessageThunk`, async (data, { dispatch }) => {
  dispatch(changeLoading(true));
  const res = await Api.getRoomMessages(data);
  dispatch(changeLoading(false));
  return res;
});

export const addRoomThunk = createAsyncThunk<IRoom, Partial<IRoom>>(
  `addRoom`,
  async (data, { dispatch }) => {
    const res = await Api.addRoom(data);
    dispatch(shiftRoom(res));
    return res;
  }
);

export const loadRoomCursorMessagesThunk = createAsyncThunk<
  { message: IMessage[]; hasMore: boolean },
  MessageCursorRequest
>(`loadRoomCursorMessagesThunk`, async (data) => {
  return Api.getRoomMessagesByCursor(data);
});

export const openMessageWindowThunk = createAsyncThunk<
  MessageWindowResponse,
  MessageWindowRequest
>(`openMessageWindowThunk`, async (data, { dispatch }) => {
  dispatch(changeLoading(true));
  try {
    const windowData = await Api.getRoomMessageWindow(data);
    dispatch(openMessageWindow(windowData));
    return windowData;
  } finally {
    dispatch(changeLoading(false));
  }
});

export const updateRoomThunk =
  (data: Partial<Room>): AppThunk =>
  async (dispatch, getState) => {
    const room = await Api.updateRoom(data);
    const currentRoom = getState().room.data;
    dispatch(
      initialMessage({
        ...room,
        message: currentRoom.message,
        totalCount: currentRoom.totalCount,
        hasMoreMessage: currentRoom.hasMoreMessage,
      })
    );
  };

export const joinRoomThunk = createAsyncThunk<IRoom, { id?: string }>(
  "joinRoom",
  async (data, { dispatch }) => {
    const res = await Api.joinRoom(data);
    dispatch(fetchUserInfoThunk());
    return res;
  }
);

export const roomSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    changeLoading(state, action: PayloadAction<boolean>) {
      state.loadingMessage = action.payload;
    },
    scrollToTop(state, action) {
      state.scrollToTop = action.payload ? Math.random() : -Math.random();
    },
    scrollToEnd(state, action) {
      state.scrollToEnd = action.payload ? Math.random() : -Math.random();
    },
    loadMoreMessage(state, action: PayloadAction<IMessage[]>) {
      state.data.message = [...action.payload, ...state.data.message];
    },
    appendMoreMessage(state, action: PayloadAction<IMessage[]>) {
      const existing = new Set(
        state.data.message.map((item) => String(item.id))
      );
      state.data.message.push(
        ...action.payload.filter((item) => !existing.has(String(item.id)))
      );
    },
    setHasMoreMessage(state, action: PayloadAction<boolean>) {
      state.data.hasMoreMessage = action.payload;
      state.data.hasMoreBefore = action.payload;
    },
    setHasMoreAfter(state, action: PayloadAction<boolean>) {
      state.data.hasMoreAfter = action.payload;
    },
    mergeMessages(state, action: PayloadAction<IMessage[]>) {
      const merged = [...state.data.message, ...action.payload];
      const unique = new Map<string, IMessage>();
      for (const message of merged) {
        unique.set(String(message.id), message);
      }
      state.data.message = Array.from(unique.values()).sort(
        (a, b) => a.seq - b.seq
      );
    },
    changeRoomId(state, action) {
      state.id = action.payload;
    },
    addMessage(state, action: PayloadAction<IMessage>) {
      if (state.data.messageWindowMode && state.data.hasMoreAfter) {
        return state;
      }
      state.data.message.push(action.payload);
      return state;
    },
    replaceMessage(
      state,
      action: PayloadAction<{ id: string; message: IMessage }>
    ) {
      const index = state.data.message.findIndex(
        (message) => String(message.id) === String(action.payload.id)
      );
      if (index >= 0) {
        state.data.message[index] = action.payload.message;
        return state;
      }
      state.data.message.push(action.payload.message);
      return state;
    },
    updateMessageStatus(
      state,
      action: PayloadAction<{
        id: string;
        localStatus: IMessage["localStatus"];
      }>
    ) {
      const message = state.data.message.find(
        (item) => String(item.id) === String(action.payload.id)
      );
      if (message) {
        message.localStatus = action.payload.localStatus;
      }
    },
    appendRoomUsers(
      state,
      action: PayloadAction<{
        role: "member" | "admin";
        users: IRoom["member"];
        totalCount?: number;
      }>
    ) {
      const key = action.payload.role === "admin" ? "admin" : "member";
      const totalKey =
        action.payload.role === "admin"
          ? "adminTotalCount"
          : "memberTotalCount";
      const currentUsers = state.data[key] ?? [];
      const unique = new Map<string, IRoom["member"][number]>();
      for (const user of currentUsers) {
        unique.set(String(user.id), user);
      }
      for (const user of action.payload.users ?? []) {
        unique.set(String(user.id), user);
      }
      state.data[key] = Array.from(unique.values()) as any;
      if (typeof action.payload.totalCount === "number") {
        state.data[totalKey] = action.payload.totalCount as any;
      }
    },
    initialMessage(state, action: PayloadAction<Partial<IRoom>>) {
      state.data = { ...state.data, ...action.payload };
    },
    openMessageWindow(state, action: PayloadAction<MessageWindowResponse>) {
      state.data.message = action.payload.message;
      state.data.totalCount = action.payload.totalCount;
      state.data.hasMoreMessage = action.payload.hasMoreBefore;
      state.data.hasMoreBefore = action.payload.hasMoreBefore;
      state.data.hasMoreAfter = action.payload.hasMoreAfter;
      state.data.messageWindowMode = true;
    },
    // sync method, just modify state
    markReadMessage(
      state,
      action: PayloadAction<{ id: string; readSeq?: IReadMessage["readSeq"] }>
    ) {
      const room = action.payload;
      if (room.id === state.id) {
        state.data.readSeq ??= {};
        mergeReadSeqForward(state.data.readSeq, room.readSeq ?? {});
      }
    },
    updateSelectedMessage(state, action: PayloadAction<IMessage | undefined>) {
      const message = action.payload;
      Object.assign(state, {
        selectedMessage: message,
      });
    },
    recallExistMessage(state, action: PayloadAction<IMessage>) {
      const message = action.payload;
      if (state.data.id !== message.channelId) return;
      const msg = state.data.message.find((msg) => msg.id === message.id);
      if (msg) {
        Object.assign(msg, message);
      }
    },
    updateReplyMessage(state, action: PayloadAction<IMessage | undefined>) {
      const message = action.payload;
      Object.assign(state, {
        replyMessage: message,
      });
    },
  },
});

export const {
  scrollToTop,
  scrollToEnd,
  addMessage,
  replaceMessage,
  loadMoreMessage,
  appendMoreMessage,
  setHasMoreMessage,
  setHasMoreAfter,
  mergeMessages,
  appendRoomUsers,
  initialMessage,
  openMessageWindow,
  changeLoading,
  changeRoomId,
  markReadMessage,
  updateMessageStatus,
  updateSelectedMessage,
  recallExistMessage,
  updateReplyMessage,
} = roomSlice.actions;

export const roomReducer = roomSlice.reducer;
