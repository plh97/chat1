declare global {
  var prisma: PrismaClient;
}

import { PrismaClient } from "@prisma/client";
export {
  $Enums,
  IChannelType,
  IContentType,
  ISystemActionType,
  User,
  Room,
  MediaMessage,
  Message,
  ReadMessage,
  TextMessage,
} from "@prisma/client";

export let prisma: PrismaClient;

if (typeof window === "undefined") {
  if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient();
  } else {
    if (!global.prisma) {
      global.prisma = new PrismaClient();
    }

    prisma = global.prisma;
  }
}
