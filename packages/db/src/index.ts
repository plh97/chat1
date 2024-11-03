import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient;
}

export type {
  User,
  Room,
  MediaMessage,
  Message,
  ReadMessage,
  TextMessage,
  ChannelType,
  ContentType,
  SystemActionType,
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
