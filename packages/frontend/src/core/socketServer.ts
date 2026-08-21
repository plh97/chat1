import WebSocket, { RawData, WebSocketServer } from "ws";
import { Server as HttpServer } from "http";
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
      cb(objMsg, this.ws!, socket);
    } catch (error) {
      console.error(error);
    }
  }

  init(url: string, server: HttpServer, onMsgReceive: IOnMsgReceive) {
    if (this.ws) return;
    this.ws = new WebSocketServer({
      server,
      path: url,
    });
    console.log(`[WS] init success: ${url}`);
    this.ws.on("connection", (socket) => {
      console.log("[WS] client connected");
      socket.on("message", async (data: RawData) => {
        const msg: string = data.toString();
        this.onWsPing(msg, socket);
        if (msg === "ping") return;
        this.onMsgReceive(msg, socket, onMsgReceive);
      });
      socket.on("close", () => {
        console.log("[WS] close");
      });
    });
  }
}
