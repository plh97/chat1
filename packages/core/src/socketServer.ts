import WebSocket, { RawData, WebSocketServer } from "ws";
import { Server as HttpServer } from "http";
import { WS_EVENT } from "./constants";
import { IWsData, IOnMsgReceive } from "./interface";

export * from "./constants";

export class SocketServer {
  ws?: WebSocketServer;

  onWsPing(msg: string, socket: WebSocket) {
    if (msg === "ping") {
      socket.send("pong");
      return;
    }
  }

  onWsSubscribe(msg: string, socket: WebSocket) {
    try {
      const objMsg: { event: WS_EVENT; data: unknown; requestId: string } =
        JSON.parse(msg);
      if (objMsg?.event === WS_EVENT.SUBSCRIBE) {
        socket.send(
          JSON.stringify({
            code: 0,
            event: WS_EVENT.SUBSCRIBE,
            requestId: objMsg.requestId,
          })
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  onWsLogin(msg: string, socket: WebSocket) {
    try {
      const objMsg: IWsData = JSON.parse(msg);
      if (objMsg?.event === WS_EVENT.LOGIN) {
        socket.send(
          JSON.stringify({
            code: 0,
            event: WS_EVENT.LOGIN,
            requestId: objMsg.requestId,
          })
        );
        return;
      }
    } catch (error) {
      console.error(error);
    }
  }

  onMsgReceive(msg: string, socket: WebSocket, cb: IOnMsgReceive) {
    try {
      const objMsg: IWsData = JSON.parse(msg);
      if (objMsg?.event === WS_EVENT.SEND_MSG) {
        cb(objMsg, socket, this.ws);
      }
    } catch (error) {
      console.error(error);
    }
  }

  init(server: HttpServer, onMsgReceive: IOnMsgReceive) {
    if (this.ws) return;
    this.ws = new WebSocketServer({
      server,
      path: "/socket.io",
    });
    this.ws.on("connection", (socket) => {
      console.log("client connected");
      socket.on("message", async (data: RawData) => {
        const msg: string = data.toString();
        this.onWsPing(msg, socket);
        if (msg === "ping") return;
        this.onWsSubscribe(msg, socket);
        this.onWsLogin(msg, socket);
        this.onMsgReceive(msg, socket, onMsgReceive);
      });

      socket.on("close", () => {
        console.log("close");
      });
    });
  }
}
