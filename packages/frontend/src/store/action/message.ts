import { createAsyncThunk } from "@reduxjs/toolkit";
import { generateTemplateId, WS_EVENT } from "core";
import { formatMessage } from "@/utils/formatMessage";
import { normalizeMessage } from "@/Api";
import {
  addMessage,
  replaceMessage,
  scrollToEnd,
  updateMessageStatus,
  updateReplyMessage,
} from "../reducer/room";
import { IMessage } from "@/interfaces";
import { topUserRoom, updateUserRoomReadSeq } from "../reducer/user";

const { toast } = createStandaloneToast();

const sendOptimisticMessage = async (
  data: Partial<IMessage>,
  dispatch: any,
  getState: any,
  options?: { localMessageId?: string; skipAdd?: boolean }
) => {
  const state: any = getState();
  const room = state?.room?.data;
  const user = state?.user?.data;
  const replyMessage = data.reply ?? state?.room?.replyMessage;

  if (!options?.localMessageId && state?.room?.replyMessage?.id) {
    Object.assign(data, {
      replyId: state?.room?.replyMessage?.id,
    });
  }

  const localMessageId =
    options?.localMessageId ?? `local-${generateTemplateId()}`;
  const lastSeq = room?.message?.[room.message.length - 1]?.seq ?? 0;
  const optimisticMessage: IMessage = normalizeMessage({
    id: localMessageId,
    seq: data.seq ?? lastSeq + 1,
    contentType: data.contentType,
    channelId: data.channelId,
    roomId: data.channelId,
    textMessage: data.textMessage,
    mediaMessage: data.mediaMessage,
    userId: data.userId,
    replyId: data.replyId,
    reply: replyMessage,
    user,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: new Date(),
    isRecalled: false,
    localStatus: "sending",
  });

  if (options?.skipAdd) {
    dispatch(
      replaceMessage({
        id: localMessageId,
        message: optimisticMessage,
      })
    );
  } else {
    dispatch(addMessage(optimisticMessage));
    dispatch(topUserRoom(optimisticMessage));
    dispatch(scrollToEnd(false));
    dispatch(updateReplyMessage());
  }

  try {
    const formatMsg = await formatMessage(data);
    const wsRes = await ws.sendMsgPromise<IMessage>(formatMsg);
    if (wsRes.code === 1) {
      throw new Error(wsRes.message);
    }
    const msg = normalizeMessage(wsRes.data);
    dispatch(replaceMessage({ id: localMessageId, message: msg }));
    dispatch(topUserRoom(msg));
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
  } catch (error: any) {
    dispatch(
      updateMessageStatus({
        id: localMessageId,
        localStatus: "failed",
      })
    );
    toast({
      description: error?.message ?? "Failed to send message",
      status: "error",
      position: "top",
      duration: 1000,
    });
    return Promise.reject(error?.message ?? "Failed to send message");
  }
};

// 发送一条新消息
export const sendMessageAction = createAsyncThunk<void, Partial<IMessage>>(
  `sendMessage`,
  async (data, { dispatch, getState }) => {
    return sendOptimisticMessage(data, dispatch, getState);
  }
);

export const retryMessageAction = createAsyncThunk<void, IMessage>(
  `retryMessage`,
  async (message, { dispatch, getState, rejectWithValue }) => {
    if (!message.id || !message.channelId || !message.userId) {
      return rejectWithValue("Missing message retry payload");
    }

    try {
      await sendOptimisticMessage(message, dispatch, getState, {
        localMessageId: String(message.id),
        skipAdd: true,
      });
    } catch (error: any) {
      return rejectWithValue(
        error?.message ?? error ?? "Failed to retry message"
      );
    }
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
