import { configureStore } from "@reduxjs/toolkit";
import { logger } from "redux-logger";
import { thunk } from "redux-thunk";
import { roomReducer } from "@/store/reducer/room";
import { userReducer } from "@/store/reducer/user";

export const store = configureStore({
  reducer: {
    user: userReducer,
    room: roomReducer,
  },

  middleware: (getDefaultMiddleware) => {
    return [thunk];
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
