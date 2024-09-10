import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import Api from "@/Api";
import { STATUS } from "@/enum/common";
import { USER } from "@/interfaces/IUser";

export interface IState {
  error: string | null;
  data: USER;
  auth: boolean | null;
}

const initialState: IState = {
  error: null,
  auth: null,
  data: {
    _id: "",
    room: null,
    friend: [],
    image: "",
    username: "",
    bio: "",
    qq: "",
    wechat: "",
    github: "",
    permission: "",
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
        (room) => room._id === action.payload.roomId
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
  },
});

export const { logout, setUserInfo, updateUserRoomMessage } = userSlice.actions;

export const userReducer = userSlice.reducer;
