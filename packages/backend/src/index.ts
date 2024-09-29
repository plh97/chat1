import Koa from "koa";
import jwt from "koa-jwt";
import path from "path";
// import json from "koa-json";
import cors from "@koa/cors";
import logger from "koa-logger";
import kosStatic from "koa-static";
import koaBody from "koa-body";
import allRouter from "@/routes";
import { privateKey } from "@/config";
import socket from "./middleware/server-ws";

export const app = new Koa();
const BACKEND_PROT = process.env.PORT || process.env.BACKEND_PORT || 8080;
const whiteList = [
  "/api/login",
  "/api/logout",
  "/api/register",
  "/api/userImage",
  "/api/upload",
  "/socket.io",
];

app
  .use(logger())
  .use(koaBody({ multipart: true }))
  // .use(json())
  .use(
    cors({
      // origin: frontendOrigin,
      credentials: true,
      // maxAge: 1000 * 60 * 60 * 24 * 7,
    })
  )
  .use(
    kosStatic(path.resolve("public"), {
      gzip: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    })
  )
  .use(
    kosStatic(path.resolve("static"), {
      gzip: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    })
  )
  .use(
    jwt({
      secret: privateKey,
      getToken: (ctx: Koa.Context) => ctx.cookies.get("token") ?? "",
    }).unless({ path: whiteList })
  );

const server = app.listen(BACKEND_PROT, () => {
  console.log(`listening at port ${BACKEND_PROT}`);
});

app.use(socket(server)).use(allRouter.routes()).use(allRouter.allowedMethods());
