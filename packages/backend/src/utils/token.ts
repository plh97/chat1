import jwt from "jsonwebtoken";
import { Context } from "koa";
import { privateKey } from "@/config";

export function getVerifiedToken(ctx: Context): string | null {
  const cookie = ctx.cookies.get("token") ?? "";
  const _id = (ctx.request.query._id as string) ?? "";
  const userIdFromToken = jwt.verify(cookie, privateKey) as string;
  if (_id === userIdFromToken) {
    return userIdFromToken;
  }
  return null;
}