import jwt from "jsonwebtoken";
import { IOnMsgReceive, IWsData, WS_EVENT } from "core";
import { IMessage } from "@/interface";
import { privateKey } from "@/config";
import { RoomModel } from "@/model/room";
import { handleReadMsg } from "./readMsg";
import { handleSendMsg } from "./sendMsg";
import { handleRecallMsg } from "./recallMsg";

export const onMsgReceive: IOnMsgReceive = async (
  objMsg: IWsData<IMessage>,
  ws,
  socket
) => {
  if (socket) {
    try {
      jwt.verify(socket.protocol, privateKey);
    } catch (error: any) {
      socket.send(
        JSON.stringify({
          ...objMsg,
          code: 1,
          message: error.message,
          data: null,
        })
      );
      return;
    }
  }
  const { data, event } = objMsg;
  const room = await RoomModel.findUnique({
    where: { id: data.channelId },
    include: { message: true },
  });
  let broadcastData: Partial<IWsData<unknown>> = {};
  if (event === WS_EVENT.SEND_MSG) {
    if (data.contentType === "RECALL_MESSAGE") {
      broadcastData = await handleRecallMsg(data);
    } else if (data.contentType === "READ_MESSAGE") {
      broadcastData = await handleReadMsg(data);
    } else if (data.contentType === "CALL_MESSAGE") {
      // do nothing
    } else {
      broadcastData = await handleSendMsg(data);
    }
  }
  if (broadcastData.code !== 0) {
    socket?.send(
      JSON.stringify({
        event,
        requestId: objMsg.requestId,
        ...broadcastData,
      })
    );
    return;
  }
  let broadcastUsers = room?.memberId ?? [];
  ws.clients.forEach((client) => {
    try {
      const id = jwt.verify(client.protocol, privateKey) as string;
      if (!broadcastUsers.includes(id)) return;
      client.send(
        JSON.stringify({
          code: 0,
          event,
          requestId: objMsg.requestId,
          ...broadcastData,
        })
      );
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        client.send(
          JSON.stringify({
            code: 1,
            event,
            message: "WebSocket token verify fail",
            requestId: objMsg.requestId,
            ...broadcastData,
          })
        );
      }
    }
  });
};
