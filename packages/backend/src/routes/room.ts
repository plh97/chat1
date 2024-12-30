import { Context } from "koa";
import { verify } from "jsonwebtoken";
import { WebSocketServer } from "ws";
import { RoomModel } from "@/model/room";
import { privateKey } from "@/config";
import { handleSendMsg } from "@/ws/sendMsg";
import { sendWs } from "@/utils/sendWs";
import { onMsgReceive } from "@/ws";
import { WS_EVENT } from "core";
import { IMessage } from "@/interface";

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
      creator: true,
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
  const ws: WebSocketServer = ctx.ws;
  const newRoom = await RoomModel.create({
    data: body,
    include: {
      message: true,
      creator: true,
    },
  });
  const data = {
    contentType: "SYSTEM_MESSAGE",
    userId: newRoom.creatorId,
    channelId: newRoom.id,
    systemMessage: {
      targetList: [newRoom.creatorId],
      operator: newRoom.creatorId,
      actionType: "CREATE_ROOM",
    },
  } as IMessage;
  onMsgReceive(
    {
      event: WS_EVENT.SEND_MSG,
      data,
      requestId: "",
      message: "",
      code: 0,
    },
    ctx.ws
  );
  ctx.body = {
    code: 0,
    message: "Create room success",
    data: newRoom,
  };
};

export const updateRoom = async (ctx: Context) => {
  const body = ctx.request.body;
  const ws: WebSocketServer = ctx.ws;
  const { id, memberId, adminId, name, ...data } = body;
  const cookie = ctx.cookies.get("token") ?? "";
  const userIdFromToken = verify(cookie, privateKey) as string;
  const room = await RoomModel.update({
    where: { id },
    data: {
      ...data,
      name,
      memberId: memberId && { push: memberId },
      adminId: adminId && { push: adminId },
    },
    include: {
      member: true,
      creator: true,
      admin: true,
    },
  });
  if (memberId?.length > 0) {
    // @ts-ignore
    const broadcastData = await handleSendMsg({
      contentType: "SYSTEM_MESSAGE",
      userId: "System-message",
      channelId: room.id,
      systemMessage: {
        targetList: memberId,
        operator: userIdFromToken,
        actionType: "ADD_MEMBER",
      },
    });
    sendWs(broadcastData, ws, room);
  }
  if (adminId?.length > 0) {
    // @ts-ignore
    const broadcastData = await handleSendMsg({
      contentType: "SYSTEM_MESSAGE",
      userId: "System-message",
      channelId: room.id,
      systemMessage: {
        targetList: adminId,
        operator: userIdFromToken,
        actionType: "ADD_ADMIN",
      },
    });
    sendWs(broadcastData, ws, room);
  }
  if (name) {
    // @ts-ignore
    const broadcastData = await handleSendMsg({
      contentType: "SYSTEM_MESSAGE",
      userId: "System-message",
      channelId: room.id,
      systemMessage: {
        targetList: [],
        operator: userIdFromToken,
        actionType: "CHANGE_ROOM_NAME",
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
