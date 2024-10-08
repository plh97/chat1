import fs from "fs";
import { Context } from "koa";
import path from "path";
import Mime, { MINE } from "@/utils/mime";
// import { getAudioDurationInSeconds } from 'get-audio-duration';

const mime = new Mime();

export const Upload = async (ctx: Context) => {
  const file = ctx.request.files?.file;
  const duration = ctx.request.body.duration;
  if (!file || Array.isArray(file)) {
    ctx.body = {
      code: 1,
      message: "request paramters illegal",
    };
    return;
  }
  const fileType = file.type?.split(";")[0];
  const ext = mime.getType(fileType);
  const name = `${Math.random().toString().replace(/0./, "")}.${ext}`;
  const newpath = path.resolve("static", name);
  const topath = fs.createWriteStream(newpath);
  const stream = fs.createReadStream(file.path).pipe(topath);
  await new Promise<void>((resolve) => {
    stream.on("finish", () => {
      resolve();
    });
  });
  ctx.body = {
    code: 0,
    data: {
      name: file.name,
      fileType: fileType,
      duration,
      size: file.size,
      extension: ext,
      url: `${ctx.request.origin}/${name}`,
    },
  };
};
