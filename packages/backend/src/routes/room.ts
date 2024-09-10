import { Context } from "koa";
import { verify } from "jsonwebtoken";
import { Types } from "mongoose";
import { privateKey } from "@/config";
import { MessageModel } from "@/model/message";
import { RoomModel } from "@/model/room";

export const getRoom = async (ctx: Context) => {
  console.log(MessageModel);
  const _id = (ctx.request.query._id as string) ?? "";
  const page = +(ctx.request.query.page ?? "1");
  const start = +(ctx.request.query.start ?? "0");
  const pageSize = +(ctx.request.query.pageSize ?? "20");
  const data = await RoomModel.findOne({
    _id: new Types.ObjectId(_id),
  })
    .populate({ path: "member creater" })
    .populate({ path: "message", populate: { path: "user" } });
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
      ...data?.toJSON(),
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
    creater: new Types.ObjectId(userIdFromToken),
    member: [new Types.ObjectId(userIdFromToken), ...body.member],
    manager: new Types.ObjectId(userIdFromToken),
  });
  ctx.body = {
    code: 0,
    message: "Create room success",
    data: roomResponse,
  };
};

export const modifyRoom = async (ctx: Context) => {
  const body = ctx.request.body;
  const data = await RoomModel.updateOne(
    { _id: body._id },
    { $set: body }
  );
  ctx.body = {
    code: 0,
    data,
  };
};

export const joinRoom = async (ctx: Context) => {
  const { _id } = ctx.request.body;
  const cookie = ctx.cookies.get("token") ?? "";
  const userIdFromToken = verify(cookie, privateKey) as string;
  const room = await RoomModel.findOne(
    _id && { _id },
    {},
    { sort: { createdAt: 1 } }
  );
  if (!room?._id) {
    return (ctx.body = {
      code: 1,
      message: "haven't found a default room",
    });
  }
  if (room?.member?.includes(userIdFromToken)) {
    return (ctx.body = {
      code: 1,
      message: "you already joined this room!",
    });
  }
  await RoomModel.updateOne(
    { _id: room._id },
    { $addToSet: { member: new Types.ObjectId(userIdFromToken) } }
  );
  return (ctx.body = {
    code: 0,
    data: room,
  });
};

export const deleteRoom = async (ctx: Context) => {
  // const { _id } = ctx.request.query;
  // const res = await RoomModel.deleteOne({ _id });
  ctx.body = {
    code: 0,
    // data: res,
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
