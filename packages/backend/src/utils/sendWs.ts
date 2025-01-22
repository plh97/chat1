import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import { WS_EVENT, generateTemplateId } from "core";
import { privateKey } from "@/config";
import { IRoom } from "@/interface";

export const sendWs = async (data: any, ws: WebSocketServer, room: IRoom) => {
  let broadcastUsers = room?.memberId ?? [];
  ws.clients.forEach((client) => {
    try {
      const id = jwt.verify(client.protocol, privateKey) as string;
      if (!broadcastUsers.includes(id)) return;
      client.send(
        JSON.stringify({
          code: 0,
          event: WS_EVENT.SEND_MSG,
          requestId: generateTemplateId(),
          data,
        })
      );
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        client.send(
          JSON.stringify({
            code: 1,
            event: WS_EVENT.SEND_MSG,
            message: "WebSocket token verify fail",
            requestId: generateTemplateId(),
            data,
          })
        );
      } else {
        console.log(111, error);
      }
    }
  });
};
