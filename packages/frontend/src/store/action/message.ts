import { createAsyncThunk } from "@reduxjs/toolkit";
import { WS_EVENT } from "core";
import { formatMessage } from "@/utils/formatMessage";
import { addMessage, markReadMessage } from "../reducer/room";
import { IMessage, IRoom, IUser } from "@/interfaces";
import { IContentType } from "db";

const { toast } = createStandaloneToast();

// 发送一条新消息
export const sendMessageAction = createAsyncThunk<void, Partial<IMessage>>(
  `sendMessage`,
  async (data, { dispatch }) => {
    const formatMsg = await formatMessage(data);
    const msg = await ws.sendMsg<IMessage>(formatMsg);
    if (msg.code === 1) {
      toast({
        description: msg.message,
        status: "error",
        position: "top",
        duration: 1000,
      });
      return;
    }
    dispatch(addMessage(msg.data));
  }
);

export const markReadMessageThunk = createAsyncThunk<
  void,
  { message: IMessage; user: IUser }
>(`markReadMessage`, async ({ message, user }, { dispatch }) => {
  if (!message.channelId) return;
  const readMessage: Partial<IMessage> = {
    channelId: message.channelId,
    contentType: IContentType.READ_MESSAGE as any,
    readMessage: {
      operator: user.id,
      lastReadSeq: message.seq,
    },
  };
  const msg = await ws.sendMsg<IRoom>(readMessage, WS_EVENT.READ_MSG);
  dispatch(markReadMessage(msg.data));
});
