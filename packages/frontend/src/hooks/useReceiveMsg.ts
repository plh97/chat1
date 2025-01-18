import { IWsData, WS_EVENT } from "core";
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
    const msg = data?.data;
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
        dispatch(scrollToEnd());
      }
      dispatch(topUserRoom(msg));
      if (msg.userId === userInfo.id) {
        // if receive my own message, update last message, should mark read
        dispatch(
          updateUserRoomReadSeq({
            channelId: msg.channelId,
            readMessage: {
              lastReadSeq: NaN,
              operator: msg.userId,
              readSeq: {
                [msg.userId]: msg.seq,
              },
            },
          })
        );
      }
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
  useEventListener(WS_EVENT.SEND_MSG, onReceiveMsg);
};
