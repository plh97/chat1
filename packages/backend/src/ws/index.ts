import { privateKey } from "@/config";
import { RoomModel } from "@/model/room";
import { IOnMsgReceive, IWsData, WS_EVENT } from "core";
import jwt from "jsonwebtoken";
import { handleReadMsg } from "./readMsg";
import { handleSendMsg } from "./sendMsg";
import { IMessage } from "@/interface";

export const onMsgReceive: IOnMsgReceive = async (objMsg, socket, ws) => {
  const { data, event } = objMsg as IWsData<IMessage>;
  const room = await RoomModel.findUnique({
    where: { id: data.channelId },
    include: { message: true },
  });
  let broadcastData = null;
  if (event === WS_EVENT.READ_MSG) {
    broadcastData = await handleReadMsg(data);
  } else if (event === WS_EVENT.SEND_MSG) {
    broadcastData = await handleSendMsg(data, room!);
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
  let broadcastUsers = room?.member ?? [];
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
      console.log(error);
    }
  });
};
