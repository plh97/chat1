import jwt from "jsonwebtoken";
import { Context } from "koa";
import { verify } from "jsonwebtoken";
import { WebSocketServer } from "ws";
import { WS_EVENT, generateTemplateId } from "core";
import { IContentType, ISystemActionType } from "db";
import { RoomModel } from "@/model/room";
import { privateKey } from "@/config";
import { handleSendMsg } from "@/ws/sendMsg";

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
  const sendWs = async (data: any) => {
    let broadcastUsers = room?.memberId ?? [];
    ws.clients.forEach((client) => {
      try {
        const id = jwt.verify(client.protocol, privateKey) as string;
        if (!broadcastUsers.includes(id)) return;
        client.send(
          JSON.stringify({
            code: 0,
            event: WS_EVENT.SEND_MSG,
            requestId: generateTemplateId(),
            data,
          })
        );
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          client.send(
            JSON.stringify({
              code: 1,
              event: WS_EVENT.SEND_MSG,
              message: "WebSocket token verify fail",
              requestId: generateTemplateId(),
              data,
            })
          );
        } else {
          console.log(111, error);
        }
      }
    });
  };
  const body = ctx.request.body;
  const ws: WebSocketServer = ctx.ws;
  const room = await RoomModel.update({
    ...body,
    include: {
      member: true,
      creater: true,
      admin: true,
    },
  });
  const memberList = (
    body?.data?.member?.connect ??
    body?.data?.member ??
    []
  ).map((e: any) => e.id);
  const adminList = (body?.data?.admin?.connect ?? body?.data?.admin ?? []).map(
    (e: any) => e.id
  );
  if (memberList?.length > 0) {
    // @ts-ignore
    const broadcastData = await handleSendMsg({
      contentType: IContentType.SYSTEM_MESSAGE,
      userId: room.createrId,
      channelId: room.id,
      systemMessage: {
        targetList: memberList,
        operator: room.createrId,
        actionType: ISystemActionType.ADD_MEMBER,
      },
    });
    sendWs(broadcastData);
  } else if (adminList?.length > 0) {
    // @ts-ignore
    const broadcastData = await handleSendMsg({
      contentType: IContentType.SYSTEM_MESSAGE,
      userId: room.createrId,
      channelId: room.id,
      systemMessage: {
        targetList: adminList,
        operator: room.createrId,
        actionType: ISystemActionType.ADD_ADMIN,
      },
    });
    sendWs(broadcastData);
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
