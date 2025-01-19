import { createAsyncThunk } from "@reduxjs/toolkit";
import { WS_EVENT } from "core";
import { formatMessage } from "@/utils/formatMessage";
import { addMessage, scrollToEnd, updateReplyMessage } from "../reducer/room";
import { IMessage } from "@/interfaces";
import { topUserRoom, updateUserRoomReadSeq } from "../reducer/user";

const { toast } = createStandaloneToast();

// 发送一条新消息
export const sendMessageAction = createAsyncThunk<void, Partial<IMessage>>(
  `sendMessage`,
  async (data, { dispatch, getState }) => {
    const state: any = getState();
    if (state?.room?.replyMessage?.id) {
      Object.assign(data, {
        replyId: state?.room?.replyMessage?.id,
      });
    }
    const formatMsg = await formatMessage(data);
    const wsRes = await ws.sendMsgPromise<IMessage>(formatMsg);
    if (wsRes.code === 1) {
      toast({
        description: wsRes.message,
        status: "error",
        position: "top",
        duration: 1000,
      });
      return Promise.reject(wsRes.message);
    }
    const msg = wsRes.data;
    // push message to message list
    dispatch(addMessage(msg));
    // top this conversation to top
    dispatch(topUserRoom(msg));
    // unread count +1
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
    dispatch(scrollToEnd());
    // remove reply message
    dispatch(updateReplyMessage());
  }
);

export const markReadMessageThunk = createAsyncThunk<void, Partial<IMessage>>(
  `markReadMessage`,
  async (message) => {
    if (!message.channelId) return;
    const readMessage: Partial<IMessage> = {
      ...message,
      contentType: "READ_MESSAGE",
    };
    ws.sendMsg<IMessage>(readMessage, WS_EVENT.SEND_MSG);
  }
);

export const recallMessageThunk = createAsyncThunk<void, Partial<IMessage>>(
  `recallMessage`,
  async (message) => {
    if (!message.channelId) return;
    const recallMessage: Partial<IMessage> = {
      ...message,
      contentType: "RECALL_MESSAGE",
    };
    ws.sendMsg<IMessage>(recallMessage, WS_EVENT.SEND_MSG);
  }
);
