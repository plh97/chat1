import type { Room } from "db";
import Api from "@/Api";
import { AppThunk } from "@/hooks/app";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { IMessage, MESSAGE_REQUEST, IRoom } from "@/interfaces";
import { fetchUserInfoThunk, shiftRoom } from "./user";

export interface IState {
  id: string;
  scrollToEnd?: number;
  scrollToTop?: number;
  error: string | null;
  data: IRoom;
  loadingMessage: boolean;
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
    totalCount: 0,
    image: "",
    name: "",
    member: [],
    memberId: [],
    channelType: "PRIVATE",
    // lastMsg?: {},
    createrId: "",
    adminId: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    readSeq: {},
    admin: [],
  },
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
      pageSize: 20,
      id: id,
    });
    // 加载结束
    dispatch(changeLoading(false));
    // 将当前房间基本信息存到store里面
    dispatch(initialMessage(res));
    // div元素撑开后，滚动到底部
    dispatch(scrollToEnd());
  }
);
// 加载更多消息
export const loadRoomMoreMessageThunk = createAsyncThunk<
  IMessage[],
  MESSAGE_REQUEST
>(`loadRoomMoreMessageThunk`, async (data, { dispatch }) => {
  dispatch(changeLoading(true));
  const res = await Api.getRoom(data);
  dispatch(changeLoading(false));
  return res.message;
});

export const addRoomThunk = createAsyncThunk<IRoom, Partial<IRoom>>(
  `addRoom`,
  async (data, { dispatch }) => {
    const res = await Api.addRoom(data);
    dispatch(shiftRoom(res));
    return res;
  }
);

export const updateRoomThunk =
  (data: Partial<Room>): AppThunk =>
  async (dispatch) => {
    const roominfo = await Api.updateRoom(data);
    dispatch(initialMessage(roominfo));
  };

export const joinRoomThunk = createAsyncThunk<
  IRoom,
  { member?: string[]; name?: string }
>("joinRoom", async (data, { dispatch }) => {
  const res = await Api.joinRoom(data);
  dispatch(fetchUserInfoThunk());
  return res;
});

export const roomSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    changeLoading(state, action: PayloadAction<boolean>) {
      state.loadingMessage = action.payload;
    },
    scrollToEnd(state) {
      state.scrollToEnd = Math.random();
    },
    scrollToTop(state) {
      state.scrollToTop = Math.random();
    },
    loadMoreMessage(state, action: PayloadAction<IMessage[]>) {
      state.data.message = [...action.payload, ...state.data.message];
    },
    changeRoomId(state, action) {
      state.id = action.payload;
    },
    addMessage(state, action: PayloadAction<IMessage>) {
      state.data.message.push(action.payload);
      return state;
    },
    initialMessage(state, action: PayloadAction<Partial<IRoom>>) {
      state.data = { ...state.data, ...action.payload };
    },
    // sync method, just modify state
    markReadMessage(
      state,
      action: PayloadAction<Pick<IRoom, "id" | "readSeq">>
    ) {
      const room = action.payload;
      if (room.id === state.id) {
        Object.assign(state.data.readSeq ?? {}, room.readSeq);
      }
    },
  },
});

export const {
  scrollToTop,
  scrollToEnd,
  addMessage,
  loadMoreMessage,
  initialMessage,
  changeLoading,
  changeRoomId,
  markReadMessage,
} = roomSlice.actions;

export const roomReducer = roomSlice.reducer;
