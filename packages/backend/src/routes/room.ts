import { Context } from "koa";
import { verify } from "jsonwebtoken";
import { privateKey } from "@/config";
import { RoomModel } from "@/model/room";
import { UserModel } from "@/model/user";

export const getRoom = async (ctx: Context) => {
  const id = (ctx.request.query.id as string) ?? "";
  const page = +(ctx.request.query.page ?? "1");
  const start = +(ctx.request.query.start ?? "0");
  const pageSize = +(ctx.request.query.pageSize ?? "20");
  const data = await RoomModel.findUnique({
    where: { id },
    include: {
      message: {
        include: {
          user: true,
        },
      },
      member: true,
      creater: true,
      admin: true,
    },
  });
  let message = data?.message ?? [];
  const totalCount = data?.message?.length ?? 0;
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
  const body = ctx.request.body;
  const roomResponse = await RoomModel.create({
    data: body,
  });
  ctx.body = {
    code: 0,
    message: "Create room success",
    data: roomResponse,
  };
};

export const updateRoom = async (ctx: Context) => {
  const body = ctx.request.body;
  const data = await RoomModel.update({
    ...body,
    include: {
      member: true,
      creater: true,
      admin: true,
    },
  });
  ctx.body = {
    code: 0,
    data,
    message: "update room success!"
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
    if (room?.memberId?.includes(userIdFromToken)) {
      return (ctx.body = {
        code: 1,
        message: "you already joined this room!",
      });
    }
  }
  await RoomModel.update({
    where: { id: room?.id },
    data: { memberId: { push: userIdFromToken } },
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
  updateRoom,
  deleteRoom,
  deleteMessage,
};
