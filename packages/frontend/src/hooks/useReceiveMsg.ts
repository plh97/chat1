import { IWsData, WS_EVENT } from "@/core";
import { normalizeMessage, normalizeUser } from "@/Api";
import { IMessage, IRoom, IUser } from "@/interfaces";
import type { SystemActionType } from "@/interfaces/chat";
import {
  fetchUserInfoThunk,
  topUserRoom,
  updateUserLastMsg,
  updateUserRoomReadSeq,
} from "@/store/reducer/user";
import {
  addMessage,
  initialMessage,
  markReadMessage,
  recallExistMessage,
  refreshRoomInfoThunk,
  scrollToEnd,
} from "@/store/reducer/room";
import { useEffect, useRef, type MutableRefObject } from "react";
import { updateUserReferences } from "@/store/reducer/userReferences";

const ROOM_DETAIL_ACTIONS = new Set<SystemActionType>([
  "ADD_MEMBER",
  "REMOVE_MEMBER",
  "ADD_ADMIN",
  "REMOVE_ADMIN",
  "CHANGE_ROOM",
  "UPDATE_ROOM",
  "TRANSFER_OWNER",
]);

export const isRoomDetailAction = (action?: SystemActionType) =>
  Boolean(action && ROOM_DETAIL_ACTIONS.has(action));

export const useReceiveMsg = (roomRef: MutableRefObject<IRoom>) => {
  const dispatch = useAppDispatch();
  const pendingRefresh = useRef<{
    roomId: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const cancelPendingRefresh = () => {
    if (!pendingRefresh.current) return;
    clearTimeout(pendingRefresh.current.timer);
    pendingRefresh.current = null;
  };
  const scheduleRoomRefresh = (roomId: string) => {
    cancelPendingRefresh();
    const timer = setTimeout(() => {
      pendingRefresh.current = null;
      void dispatch(refreshRoomInfoThunk(roomId)).catch(() => undefined);
    }, 50);
    pendingRefresh.current = { roomId, timer };
  };
  useEffect(() => cancelPendingRefresh, []);

  const onReceiveMsg = async (data?: IWsData<IMessage>) => {
    const msg = data?.data ? normalizeMessage(data.data) : undefined;
    if (!msg) return;
    const room = roomRef.current;
    if (msg.contentType === "SYSTEM_MESSAGE") {
      const action = msg.systemMessage?.actionType;
      if (isRoomDetailAction(action) && msg.channelId === room.id) {
        // One room mutation can emit several system messages. Coalesce those
        // into one metadata refresh; ROOM_LIST_CHANGED below flushes it early.
        scheduleRoomRefresh(msg.channelId);
      }
    }
    if (
      msg.contentType === "SYSTEM_MESSAGE" ||
      msg.contentType === "MEDIA_MESSAGE" ||
      msg.contentType === "TEXT_MESSAGE"
    ) {
      if (msg?.channelId === room.id) {
        dispatch(addMessage(msg));
        dispatch(scrollToEnd(true));
      }
      dispatch(topUserRoom(msg));
    } else if (msg.contentType === "READ_MESSAGE") {
      if (room?.id === msg.channelId) {
        dispatch(
          markReadMessage({
            id: room.id,
            readSeq: msg.readMessage?.readSeq,
          })
        );
      }
      dispatch(updateUserRoomReadSeq(msg));
    } else if (msg.contentType === "RECALL_MESSAGE") {
      dispatch(recallExistMessage(msg));
      dispatch(updateUserLastMsg(msg));
    }
  };
  const onRoomListChanged = async () => {
    cancelPendingRefresh();
    await dispatch(fetchUserInfoThunk());
    const currentRoomId = roomRef.current?.id;
    if (!currentRoomId) return;
    try {
      // Also refresh the active room so a removed user immediately becomes an
      // outsider. The refresh thunk keeps the current message/search window.
      await dispatch(refreshRoomInfoThunk(currentRoomId));
    } catch {
      // A deleted/private room may no longer be readable. Disable sending
      // against stale membership while its entry disappears from the list.
      dispatch(initialMessage({ isMember: false }));
    }
  };
  const onUserUpdated = async (data?: IWsData<IUser>) => {
    if (!data?.data) return;
    dispatch(updateUserReferences(normalizeUser(data.data)));
  };
  useEventListener(WS_EVENT.SEND_MSG, onReceiveMsg);
  useEventListener(WS_EVENT.ROOM_LIST_CHANGED, onRoomListChanged);
  useEventListener(WS_EVENT.USER_UPDATED, onUserUpdated);
};
