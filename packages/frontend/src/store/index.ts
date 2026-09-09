import { configureStore } from "@reduxjs/toolkit";
import { roomReducer } from "@/store/reducer/room";
import { userReducer } from "@/store/reducer/user";

export const store = configureStore({
  reducer: {
    user: userReducer,
    room: roomReducer,
  },
  middleware: (getDefaultMiddleware) => {
    const res = getDefaultMiddleware({
      serializableCheck: false,
    });
    // if (process.env.NODE_ENV === "development") {
    //   return res.concat(logger);
    // }
    return res;
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
