import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import Api from "@/Api";
import { STATUS } from "@/enum/common";
import { IRoom, IUser } from "@/interfaces";
import { IMessage } from "@/interfaces/IMessage";

export interface IState {
  error: string | null;
  data: IUser;
  auth: boolean | null;
  draftMap: Record<string, Partial<IMessage>>;
}

const initialState: IState = {
  error: null,
  auth: null,
  draftMap: {},
  data: {
    id: "",
    room: [],
    friend: [],
    image: "",
    username: "",
    bio: "",
    qq: "",
    wechat: "",
    github: "",
    permission: "",
    friendId: [],
    UserId: [],
  },
};

export const fetchUserInfoThunk = createAsyncThunk(
  `getMyUserInfo`,
  async (_, { dispatch }) => {
    const userinfo = await Api.getMyUserInfo();
    dispatch(setUserInfo(userinfo));
  }
);

export const loginThunk = createAsyncThunk<
  void,
  { username: string; password: string }
>(`login`, async (data, { dispatch }) => {
  const isSuc = await Api.login(data);
  if (!isSuc) return;
  dispatch(fetchUserInfoThunk());
});
export const logoutThunk = createAsyncThunk(
  `logout`,
  async (_, { dispatch }) => {
    await Api.logout();
    dispatch(logout());
  }
);

export const registerThunk = createAsyncThunk<
  void,
  { username: string; password: string }
>(`register`, async (data, { dispatch }) => {
  const isSuc = await Api.register(data);
  if (!isSuc) return;
  dispatch(fetchUserInfoThunk());
});

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateUserRoomMessage(state, action) {
      const room = state.data.room?.find(
        (room) => room.id === action.payload.roomId
      );
      if (room?.message) {
        room.message = [action.payload.msg];
        state.data.room?.sort((a) => {
          if (a === room) return -1;
          return 0;
        });
      }
    },
    setUserInfo(state, action) {
      Object.assign(state, {
        auth: true,
        data: {
          ...state.data,
          ...action.payload,
        },
      });
    },
    logout(state) {
      Object.assign(state, {
        auth: false,
        status: STATUS.FAILED,
      });
    },
    setDraft(state, action: PayloadAction<Partial<IMessage>>) {
      if (action.payload.channelId) {
        state.draftMap[action.payload.channelId] = action.payload;
      }
    },
    // update room readSeq
    updateUserRoomReadSeq(state, action: PayloadAction<Partial<IRoom>>) {
      const room = action.payload;
      if (room.id) {
        const _room = state.data.room?.find((r) => r.id === room.id);
        if (room?.readSeq && _room?.readSeq) {
          Object.assign(_room.readSeq, room.readSeq);
        }
      }
    },
    // move room to top, update lastMsg
    topUserRoom(state, action: PayloadAction<IMessage>) {
      const msg = action.payload;
      const roomList = state.data.room ?? [];
      const room = state.data.room?.find(
        (room) => room.id === action.payload.channelId
      );
      state.data.room = [
        // @ts-ignore
        {
          ...room,
          lastMsg: msg,
        },
        ...(roomList?.filter((r) => r.id !== msg.channelId) ?? []),
      ];
    },
  },
});

export const {
  logout,
  setUserInfo,
  updateUserRoomMessage,
  setDraft,
  updateUserRoomReadSeq,
  topUserRoom,
} = userSlice.actions;

export const userReducer = userSlice.reducer;
