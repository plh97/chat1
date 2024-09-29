import { Context } from "koa";
import { verify } from "jsonwebtoken";
import { privateKey } from "@/config";
import { RoomModel } from "@/model/room";

export const getRoom = async (ctx: Context) => {
  const id = (ctx.request.query.id as string) ?? "";
  const page = +(ctx.request.query.page ?? "1");
  const start = +(ctx.request.query.start ?? "0");
  const pageSize = +(ctx.request.query.pageSize ?? "20");
  const data = await RoomModel.findUnique({
    where: { id },
  });
  // .populate({ path: "member creater" })
  // .populate({ path: "message", populate: { path: "user" } });
  let message = data?.messageId ?? [];
  const totalCount = data?.messageId?.length ?? 0;
  if (start) {
    const begin = totalCount - +start - pageSize;
    const end = totalCount - +start;
    message = message.slice(Math.max(begin, 0), end);
  } else {
    message = message.slice(
      totalCount < page * pageSize ? 0 : totalCount - page * pageSize,
      totalCount - (page - 1) * pageSize
    );
  }
  ctx.body = {
    code: 0,
    data: {
      ...data,
      totalCount,
      message,
    },
  };
};

export const addRoom = async (ctx: Context) => {
  const body: { member: string[] } = ctx.request.body;
  const cookie = ctx.cookies.get("token") ?? "";
  const userIdFromToken = verify(cookie, privateKey) as string;
  const roomResponse = await RoomModel.create({
    ...body,
    // @ts-ignore
    creater: userIdFromToken,
    member: [userIdFromToken, ...body.member],
    manager: userIdFromToken,
  });
  ctx.body = {
    code: 0,
    message: "Create room success",
    data: roomResponse,
  };
};

export const modifyRoom = async (ctx: Context) => {
  const body = ctx.request.body;
  const data = await RoomModel.update({
    where: { id: body.id },
    data: body,
  });
  ctx.body = {
    code: 0,
    data,
  };
};

export const joinRoom = async (ctx: Context) => {
  let id = ctx.request.body?.id;
  const cookie = ctx.cookies.get("token") ?? "";
  const userIdFromToken = verify(cookie, privateKey) as string;
  const room = await RoomModel.findFirst();
  if (!id) {
    if (!room) {
      return (ctx.body = {
        code: 1,
        message: "haven't found a default room",
      });
    }
    id = room.id;
    if (room?.member?.includes(userIdFromToken)) {
      return (ctx.body = {
        code: 1,
        message: "you already joined this room!",
      });
    }
  }
  await RoomModel.update({
    where: { id: room?.id },
    data: { member: { push: userIdFromToken } },
  });
  return (ctx.body = {
    code: 0,
    data: room,
  });
};

export const deleteRoom = async (ctx: Context) => {
  const id = ctx.request.query.id as string;
  const res = await RoomModel.delete({ where: { id } });
  ctx.body = {
    code: 0,
    data: res,
    message: "done",
  };
};

export const deleteMessage = async (ctx: Context) => {
  ctx.body = {
    code: 0,
    message: "done",
    // data: res,
  };
};

export default {
  addRoom,
  getRoom,
  modifyRoom,
  deleteRoom,
  deleteMessage,
};
