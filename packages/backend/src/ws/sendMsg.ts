import { MessageModel } from "@/model/message";
import { RoomModel } from "@/model/room";
import { IContentType, Message, Room as IRoomCore } from "db";

export const handleSendMsg = async (data: Message, room: IRoomCore) => {
  if (
    data.contentType === IContentType.TEXT_MESSAGE ||
    data.contentType === IContentType.SYSTEM_MESSAGE ||
    data.contentType === IContentType.MEDIA_MESSAGE
  ) {
    const seq = room?.messageId.length;
    const message = await MessageModel.create({
      // @ts-ignore
      data: { ...data, seq: seq ?? 0 + 1 },
    });
    // await message.populate("user");
    await RoomModel.update({
      where: { id: data.channelId },
      data: {
        messageId: { push: message.id },
        updatedAt: new Date(),
        readSeq: {
          [data.user as string]: message.seq,
        },
      },
    });
    return message;
  }
  return data;
};
