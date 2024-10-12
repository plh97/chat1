import Router from "koa-router";

import {
  Login,
  Logout,
  Register,
  GetUserInfo,
  SetUserInfo,
  GetUserImage,
  QueryUser,
  AddFriend,
  DeleteFriend,
} from "./user";
import { Upload } from "./image";

import {
  addRoom,
  getRoom,
  deleteRoom,
  updateRoom,
  deleteMessage,
  joinRoom,
} from "./room";

const router = new Router({ prefix: "/api" });

export default router
  // image
  .post("/upload", Upload)
  // user
  .post("/login", Login)
  .post("/logout", Logout)
  .post("/register", Register)
  .get("/userInfo", GetUserInfo)
  .get("/user", QueryUser)
  .post("/friend", AddFriend)
  .delete("/friend", DeleteFriend)
  .post("/userInfo", SetUserInfo)
  .get("/userImage", GetUserImage)
  // room
  .post("/room", addRoom)
  .get("/room", getRoom)
  .patch("/room", updateRoom)
  .delete("/room", deleteRoom)
  .post("/joinRoom", joinRoom)
  .delete("/room/message", deleteMessage);
