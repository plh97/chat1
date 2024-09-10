import { privateKey } from "@/config";
import { MessageModel } from "@/model/message";
import { RoomModel } from "@/model/room";
import { IOnMsgReceive, IWsData, WS_EVENT } from "@chatroom/core";
import jwt from "jsonwebtoken";
import { WebSocket } from "ws";

export const onMsgReceive: IOnMsgReceive = async (objMsg, socket, ws) => {
  const body = objMsg.data;
  // add new message
  // update room last modify time
  const data = await (await MessageModel.create(body)).populate("user");
  const room = await RoomModel.updateOne(
    { _id: body.channelId },
    { $addToSet: { message: data._id } }
  ).findOneAndUpdate(
    { _id: body.channelId },
    { $set: { updatedAt: new Date() } }
  );
  if (!data) {
    JSON.stringify({
      code: 1,
      event: WS_EVENT.SEND_MSG,
      requestId: objMsg.requestId,
      data: null,
    });
    return;
  }
  let broadcastUsers = room?.member ?? [];
  ws.clients.forEach((client) => {
    try {
      const _id = jwt.verify(client.protocol, privateKey) as string;
      if (!broadcastUsers.includes(_id)) return;
      client.send(
        JSON.stringify({
          code: 0,
          event: WS_EVENT.SEND_MSG,
          requestId: objMsg.requestId,
          data,
        })
      );
    } catch (error) {
      console.log(error);
    }
  });
};
