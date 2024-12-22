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
  RecallMessage,
  ContentType,
  SystemActionType,
} from "@prisma/client";

export let prisma: PrismaClient;

if (typeof window === "undefined") {
  if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient();
    console.log("[PROD][DB] init success");
  } else {
    if (!global.prisma) {
      console.log("[DEV][DB] init start");
      global.prisma = new PrismaClient();
      console.log("[DEV][DB] init success");
    }
    prisma = global.prisma;
  }
  prisma.user.findFirst().then((user) => {
    console.log(`[DB] User count: ${user?.username}`);
  });
}
