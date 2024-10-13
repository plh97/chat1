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

  onMsgReceive(msg: string, socket: WebSocket, cb: IOnMsgReceive) {
    try {
      const objMsg: IWsData = JSON.parse(msg);
      if (objMsg?.event === WS_EVENT.SEND_MSG) {
        // @ts-ignore
        cb(objMsg, socket, this.ws);
      } else if (objMsg?.event === WS_EVENT.READ_MSG) {
        // @ts-ignore
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
      path: "/chat",
    });
    this.ws.on("connection", (socket) => {
      console.log("client connected");
      socket.on("message", async (data: RawData) => {
        const msg: string = data.toString();
        this.onWsPing(msg, socket);
        if (msg === "ping") return;
        this.onMsgReceive(msg, socket, onMsgReceive);
      });

      socket.on("close", () => {
        console.log("close");
      });
    });
  }
}
