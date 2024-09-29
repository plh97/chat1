import jwt from "jsonwebtoken";
import { Context } from "koa";
import { privateKey } from "@/config";

export function getVerifiedToken(ctx: Context): string | null {
  const cookie = ctx.cookies.get("token") ?? "";
  const id = (ctx.request.query.id as string) ?? "";
  const userIdFromToken = jwt.verify(cookie, privateKey) as string;
  if (id === userIdFromToken) {
    return userIdFromToken;
  }
  return null;
}
