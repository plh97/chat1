import { createAsyncThunk } from "@reduxjs/toolkit";
import { IMessage as IMessageCore } from "@chatroom/core";
import { formatMessage } from "@/utils/formatMessage";
import { addMessage } from "../reducer/room";
import { IMessage } from "@/interfaces/IMessage";

// 发送一条新消息
export const sendMessageAction = createAsyncThunk<void, IMessageCore>(
  `sendMessage`,
  async (data, { dispatch }) => {
    const formatMsg = await formatMessage(data);
    const msg = await ws.sendMsg<IMessage>(formatMsg);
    dispatch(addMessage(msg.data));
  }
);
