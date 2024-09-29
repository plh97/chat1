import { Context } from "koa";

import { MessageModel } from "@/model/message";

const sendMessage = async (ctx: Context) => {
  const body = ctx.request.body;
  const data = await MessageModel.create(body);
  // const data = await MessageModel.findUnique({ where: msg });
  // .populate("user");
  ctx.body = {
    code: 0,
    data,
  };
};

const deleteMessage = async (ctx: Context) => {
  const id = ctx.request.query.id as string;
  const res = await MessageModel.delete({ where: { id } });
  ctx.body = {
    code: 0,
    data: res,
  };
};

export default {
  sendMessage,
  deleteMessage,
};
