import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import Api from "@/Api";
import { STATUS } from "@/enum/common";
import { IRoom, IUser } from "@/interfaces";
import { IMessage } from "@/interfaces/IMessage";
import { setToken } from "@/utils";
import { mergeReadSeqForward } from "./readSeq";
import {
  getUserReferenceKey,
  patchRoomUserReferences,
  patchMessageUserReferences,
  patchUserReference,
  sanitizeUserReferencePatch,
  type UserReferencePatch,
  updateUserReferences,
} from "./userReferences";

export interface IState {
  error: string | null;
  data: IUser;
  auth: boolean | null;
  draftMap: Record<string, Partial<IMessage>>;
  profileUpdates: Record<string, UserReferencePatch>;
}

const toRoomKey = (value: unknown) => String(value ?? "");

const initialState: IState = {
  error: null,
  auth: null,
  draftMap: {},
  profileUpdates: {},
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
  await Api.register(data);
  await dispatch(loginThunk(data));
});

export const setUserInfoThunk = createAsyncThunk<IUser, Partial<IUser>>(
  `setUserInfoThunk`,
  async (data, { dispatch }) => {
    const updatedUser = await Api.setMyUserInfo(data);
    dispatch(updateUserReferences(updatedUser));
    return updatedUser;
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
      const updatedUser = await Api.setMyUserInfo({ image: endpoint_url });
      dispatch(updateUserReferences(updatedUser));
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
      const roomIndex = state.data.room?.findIndex(
        (room) => toRoomKey(room.id) === roomId
      );
      if (roomIndex == null || roomIndex < 0 || !state.data.room) return;
      const [room] = state.data.room.splice(roomIndex, 1);
      room.lastMsg = action.payload.msg;
      state.data.room.unshift(room);
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
      const roomId = toRoomKey(action.payload.id);
      Object.assign(state.data, {
        room: [
          action.payload,
          ...(state.data.room ?? []).filter(
            (room) => toRoomKey(room.id) !== roomId
          ),
        ],
      });
    },
    updateLocalUserRoom(state, action: PayloadAction<IRoom>) {
      const roomId = toRoomKey(action.payload.id);
      const room = state.data.room?.find(
        (entry) => toRoomKey(entry.id) === roomId
      );
      if (!room) return;
      Object.assign(room, action.payload);
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
        if (readMessage?.readSeq && room) {
          room.readSeq ??= {};
          mergeReadSeqForward(room.readSeq, readMessage.readSeq);
          if (toRoomKey(readMessage.operator) === toRoomKey(state.data.id)) {
            room.unreadCount = 0;
          }
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
          unreadCount:
            toRoomKey(msg.userId) === toRoomKey(state.data.id)
              ? (room.unreadCount ?? 0)
              : (room.unreadCount ?? 0) + 1,
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
  extraReducers: (builder) => {
    builder.addCase(updateUserReferences, (state, action) => {
      const userId = getUserReferenceKey(action.payload);
      if (userId) {
        state.profileUpdates[userId] = {
          ...state.profileUpdates[userId],
          ...sanitizeUserReferencePatch(action.payload),
        };
      }
      patchUserReference(state.data, action.payload);
      state.data.friend?.forEach((user) =>
        patchUserReference(user, action.payload)
      );
      state.data.room?.forEach((room) =>
        patchRoomUserReferences(room, action.payload)
      );
      Object.values(state.draftMap).forEach((draft) =>
        patchMessageUserReferences(draft as IMessage, action.payload)
      );
    });
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
  updateLocalUserRoom,
  updateUserLastMsg,
} = userSlice.actions;

export const userReducer = userSlice.reducer;
