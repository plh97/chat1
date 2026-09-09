import { IWsData, WS_EVENT } from "@/core";
import { normalizeMessage } from "@/Api";
import { IMessage, IRoom } from "@/interfaces";
import {
  fetchUserInfoThunk,
  topUserRoom,
  updateUserLastMsg,
  updateUserRoomReadSeq,
} from "@/store/reducer/user";
import {
  addMessage,
  markReadMessage,
  recallExistMessage,
  scrollToEnd,
} from "@/store/reducer/room";
import { MutableRefObject } from "react";

export const useReceiveMsg = (roomRef: MutableRefObject<IRoom>) => {
  const dispatch = useAppDispatch();
  const userInfo = useAppSelector((state) => state.user.data);
  const onReceiveMsg = async (data?: IWsData<IMessage>) => {
    const msg = data?.data ? normalizeMessage(data.data) : undefined;
    if (!msg) return;
    const room = roomRef.current;
    if (msg.contentType === "SYSTEM_MESSAGE") {
      const sysMsg = msg.systemMessage;
      if (
        sysMsg?.actionType === "ADD_FRIEND" ||
        sysMsg?.actionType === "CREATE_ROOM" ||
        sysMsg?.actionType === "REMOVE_ROOM"
      ) {
        await dispatch(fetchUserInfoThunk());
      } else if (
        sysMsg?.actionType === "ADD_MEMBER" ||
        sysMsg?.actionType === "REMOVE_MEMBER"
      ) {
        if (sysMsg.content?.includes(userInfo.id)) {
          await dispatch(fetchUserInfoThunk());
        }
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
    await dispatch(fetchUserInfoThunk());
  };
  useEventListener(WS_EVENT.SEND_MSG, onReceiveMsg);
  useEventListener(WS_EVENT.ROOM_LIST_CHANGED, onRoomListChanged);
};
