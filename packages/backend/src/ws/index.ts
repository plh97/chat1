import jwt from "jsonwebtoken";
import { IOnMsgReceive, IWsData, WS_EVENT } from "core";
import { IMessage } from "@/interface";
import { privateKey } from "@/config";
import { RoomModel } from "@/model/room";
import { handleReadMsg } from "./readMsg";
import { handleSendMsg } from "./sendMsg";
import { handleRecallMsg } from "./recallMsg";

export const onMsgReceive: IOnMsgReceive = async (objMsg, socket, ws) => {
  try {
    jwt.verify(socket.protocol, privateKey) as string;
  } catch (error: any) {
    socket.send(
      JSON.stringify({
        code: 1,
        message: error.message,
        event: objMsg.event,
        requestId: objMsg.requestId,
        data: null,
      })
    );
    return;
  }
  const { data, event } = objMsg as IWsData<IMessage>;
  const room = await RoomModel.findUnique({
    where: { id: data.channelId },
    include: { message: true },
  });
  let broadcastData = null;
  if (event === WS_EVENT.READ_MSG) {
    broadcastData = await handleReadMsg(data);
  }
  if (event === WS_EVENT.SEND_MSG) {
    broadcastData = await handleSendMsg(data);
  }
  if (event === WS_EVENT.RECALL_MSG) {
    broadcastData = await handleRecallMsg(data);
  }
  if (!broadcastData) {
    socket.send(
      JSON.stringify({
        code: 1,
        event,
        requestId: objMsg.requestId,
        data: null,
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
          data: broadcastData,
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
            data: broadcastData,
          })
        );
      }
    }
  });
};
