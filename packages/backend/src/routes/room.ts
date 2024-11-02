import { Context } from "koa";
import { verify } from "jsonwebtoken";
import { WebSocketServer } from "ws";
import { IContentType, ISystemActionType } from "db";
import { RoomModel } from "@/model/room";
import { privateKey } from "@/config";
import { handleSendMsg } from "@/ws/sendMsg";
import { sendWs } from "@/utils/sendWs";

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
  const newRoom = await RoomModel.create({
    data: body,
    include: {
      message: true,
      creater: true,
    },
  });
  // @ts-ignore
  handleSendMsg({
    contentType: IContentType.SYSTEM_MESSAGE,
    userId: newRoom.createrId,
    channelId: newRoom.id,
    systemMessage: {
      targetList: [newRoom.createrId],
      operator: newRoom.createrId,
      actionType: ISystemActionType.CREATE_ROOM,
    },
  });
  ctx.body = {
    code: 0,
    message: "Create room success",
    data: newRoom,
  };
};

export const updateRoom = async (ctx: Context) => {
  const body = ctx.request.body;
  const ws: WebSocketServer = ctx.ws;
  const { id, memberId, adminId, ...data } = body;
  const room = await RoomModel.update({
    where: { id },
    data: {
      ...data,
      memberId: memberId && { push: memberId },
      adminId: adminId && { push: adminId },
    },
    include: {
      member: true,
      creater: true,
      admin: true,
    },
  });
  if (memberId?.length > 0) {
    // @ts-ignore
    const broadcastData = await handleSendMsg({
      contentType: IContentType.SYSTEM_MESSAGE,
      userId: "System-message",
      channelId: room.id,
      systemMessage: {
        targetList: memberId,
        operator: room.createrId,
        actionType: ISystemActionType.ADD_MEMBER,
      },
    });
    sendWs(broadcastData, ws, room);
  } else if (adminId?.length > 0) {
    // @ts-ignore
    const broadcastData = await handleSendMsg({
      contentType: IContentType.SYSTEM_MESSAGE,
      userId: "System-message",
      channelId: room.id,
      systemMessage: {
        targetList: adminId,
        operator: room.createrId,
        actionType: ISystemActionType.ADD_ADMIN,
      },
    });
    sendWs(broadcastData, ws, room);
  }
  ctx.body = {
    code: 0,
    data: room,
    message: "update room success!",
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
