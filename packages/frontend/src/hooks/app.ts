import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from "@/store";
import { ThunkAction } from "@reduxjs/toolkit";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
// export const useThunkDispatch = useDispatch<ThunkDispatch<any, void, any>>();

export const useThunkDispatch = useAppDispatch;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  any,
  unknown,
  any
>;
