import { createAsyncThunk } from "@reduxjs/toolkit";
import { WS_EVENT } from "core";
import { formatMessage } from "@/utils/formatMessage";
import { addMessage, markReadMessage } from "../reducer/room";
import { IMessage, IRoom } from "@/interfaces";
import { IContentType } from "db";
import { topUserRoom, updateUserRoomReadSeq } from "../reducer/user";

const { toast } = createStandaloneToast();

// 发送一条新消息
export const sendMessageAction = createAsyncThunk<void, Partial<IMessage>>(
  `sendMessage`,
  async (data, { dispatch }) => {
    const formatMsg = await formatMessage(data);
    const wsRes = await ws.sendMsg<IMessage>(formatMsg);
    if (wsRes.code === 1) {
      toast({
        description: wsRes.message,
        status: "error",
        position: "top",
        duration: 1000,
      });
      return;
    }
    const msg = wsRes.data;
    // push message to message list
    dispatch(addMessage(msg));
    // top this conversation to top
    dispatch(topUserRoom(msg));
    // unread count +1
    dispatch(
      updateUserRoomReadSeq({
        id: msg.channelId,
        readSeq: {
          [msg.userId]: msg.seq,
        },
      })
    );
  }
);

export const markReadMessageThunk = createAsyncThunk<void, Partial<IMessage>>(
  `markReadMessage`,
  async (message, { dispatch }) => {
    if (!message.channelId) return;
    const readMessage: Partial<IMessage> = {
      ...message,
      contentType: IContentType.READ_MESSAGE,
    };
    const wsRes = await ws.sendMsg<IRoom>(readMessage, WS_EVENT.READ_MSG);
    if (wsRes.code === 1) {
      toast({
        description: wsRes.message,
        status: "error",
        position: "top",
        duration: 1000,
      });
      return;
    }
    const msg = wsRes.data;
    // sync current room read seq to this seq
    dispatch(markReadMessage(msg));
    // sync set user room lisst read seq
    dispatch(updateUserRoomReadSeq(msg));
  }
);
