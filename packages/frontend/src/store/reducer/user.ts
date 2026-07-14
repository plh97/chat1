import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import Api from "@/Api";
import { STATUS } from "@/enum/common";
import { IRoom, IUser } from "@/interfaces";
import { IMessage } from "@/interfaces/IMessage";
import { setToken } from "@/utils";

export interface IState {
  error: string | null;
  data: IUser;
  auth: boolean | null;
  draftMap: Record<string, Partial<IMessage>>;
}

const toRoomKey = (value: unknown) => String(value ?? "");

const initialState: IState = {
  error: null,
  auth: null,
  draftMap: {},
  data: {
    userId: "",
    room: [],
    friend: [],
    image: "",
    email: "",
    userName: "",
    bio: "",
    QQ: "",
    WeChat: "",
    github: "",
    permission: "",
    friendId: [],
    UserId: [],
    id: "",
  },
};

export const fetchUserInfoThunk = createAsyncThunk(
  `getMyUserInfo`,
  async (_, { dispatch }) => {
    const userinfo = await Api.getMyUserInfo();
    dispatch(setLocalUserInfo(userinfo));
  }
);

export const loginThunk = createAsyncThunk<
  void,
  { email: string; password: string }
>(`login`, async (data, { dispatch }) => {
  const datajson = await Api.login(data);
  if (!datajson?.accessToken) return;
  setToken(datajson.accessToken);
  dispatch(fetchUserInfoThunk());
});

export const logoutThunk = createAsyncThunk(
  `logout`,
  async (_, { dispatch }) => {
    await Api.logout();
    setToken("");
    dispatch(logout());
  }
);

export const registerThunk = createAsyncThunk<
  void,
  { email: string; password: string }
>(`register`, async (data, { dispatch }) => {
  const isSuc = await Api.register(data);
  if (!isSuc) return;
  dispatch(fetchUserInfoThunk());
});

export const setUserInfoThunk = createAsyncThunk<void, Partial<IUser>>(
  `setUserInfoThunk`,
  async (data, { dispatch }) => {
    await Api.setMyUserInfo(data);
    dispatch(setLocalUserInfo(data));
  }
);

export const uploadImageThunk = createAsyncThunk<
  string,
  { file: File; upload_scene?: number; updateUserImage?: boolean }
>(
  `uploadImage`,
  async ({ file, upload_scene = 1, updateUserImage = true }, { dispatch }) => {
    const { uploadFileWithPresignedUrl } = await import("@/utils/uploadFile");
    const endpoint_url = await uploadFileWithPresignedUrl(file, upload_scene);
    if (updateUserImage) {
      dispatch(setLocalUserInfo({ image: endpoint_url }));
    }
    return endpoint_url;
  }
);

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateUserRoomMessage(state, action) {
      const roomId = toRoomKey(action.payload.roomId);
      const room = state.data.room?.find(
        (room) => toRoomKey(room.id) === roomId
      );
      if (room?.message) {
        room.message = [action.payload.msg];
        state.data.room?.sort((a) => {
          if (a === room) return -1;
          return 0;
        });
      }
    },
    setLocalUserInfo(state, action: PayloadAction<Partial<IUser>>) {
      Object.assign(state, {
        auth: true,
        data: {
          ...state.data,
          ...action.payload,
        },
      });
    },
    shiftRoom(state, action: PayloadAction<IRoom>) {
      Object.assign(state.data, {
        room: [action.payload, ...(state.data.room ?? [])],
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
    removeDraft(state, action: PayloadAction<string>) {
      if (action.payload) {
        delete state.draftMap[action.payload];
      }
    },
    // update room readSeq
    updateUserRoomReadSeq(state, action: PayloadAction<Partial<IMessage>>) {
      const message = action.payload;
      if (message.channelId) {
        const channelId = toRoomKey(message.channelId);
        const readMessage = message.readMessage;
        const room = state.data.room?.find(
          (entry) => toRoomKey(entry.id) === channelId
        );
        if (readMessage?.readSeq && room?.readSeq) {
          Object.assign(room.readSeq, readMessage.readSeq);
        }
      }
    },
    // move room to top, update lastMsg
    topUserRoom(state, action: PayloadAction<IMessage>) {
      const msg = action.payload;
      const roomList = state.data.room ?? [];
      const channelId = toRoomKey(action.payload.channelId);
      const room = state.data.room?.find(
        (entry) => toRoomKey(entry.id) === channelId
      );

      if (!room) {
        return;
      }

      state.data.room = [
        {
          ...room,
          id: channelId,
          lastMsg: msg,
        },
        ...(roomList?.filter((entry) => toRoomKey(entry.id) !== channelId) ??
          []),
      ];
    },
    // update room readSeq
    updateUserLastMsg(state, action: PayloadAction<Partial<IMessage>>) {
      const message = action.payload;
      if (message.id) {
        const channelId = toRoomKey(message.channelId);
        const room = state.data.room?.find(
          (entry) => toRoomKey(entry.id) === channelId
        );
        if (room?.lastMsg?.id && room?.lastMsg?.id === message.id) {
          Object.assign(room?.lastMsg, message);
        }
      }
    },
  },
});

export const {
  logout,
  setLocalUserInfo,
  updateUserRoomMessage,
  setDraft,
  removeDraft,
  updateUserRoomReadSeq,
  topUserRoom,
  shiftRoom,
  updateUserLastMsg,
} = userSlice.actions;

export const userReducer = userSlice.reducer;
