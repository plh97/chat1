import { Context } from "koa";
import { Server as HttpServer } from "http";
import { SocketServer } from "core";
import { onMsgReceive } from "@/ws";

const socketServer = new SocketServer();

export default function socket(server: HttpServer) {
  socketServer.init("/ws", server, onMsgReceive);
  return async function socket(ctx: Context, next: () => Promise<void>) {
    ctx.ws = socketServer.ws;
    await next();
  };
}
