import { Context } from "koa";

import { MessageModel } from "@/model/message";

const sendMessage = async (ctx: Context) => {
  const body = ctx.request.body;
  const msg = await MessageModel.create(body);
  const data = await MessageModel.findOne(msg).populate("user");
  ctx.body = {
    code: 0,
    data,
  };
};

const deleteMessage = async (ctx: Context) => {
  const { _id } = ctx.request.query;
  const res = await MessageModel.deleteOne({ _id });
  ctx.body = {
    code: 0,
    data: res,
  };
};

export default {
  sendMessage,
  deleteMessage,
};
