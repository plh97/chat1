import { IMessage, IRoom } from "@/interface";
import { RoomModel } from "@/model/room";
import { IContentType } from "db";

export const handleSendMsg = async (data: IMessage, room: IRoom) => {
  if (
    data.contentType === IContentType.TEXT_MESSAGE ||
    data.contentType === IContentType.SYSTEM_MESSAGE ||
    data.contentType === IContentType.MEDIA_MESSAGE
  ) {
    const room = await RoomModel.findUnique({
      where: { id: data.channelId },
      include: {
        message: true,
      },
    });
    const msg = {
      ...data,
      seq: room?.message.length! + 1,
    };
    const readSeq = room?.readSeq ?? {};
    Object.assign(readSeq, {
      [msg.userId]: msg.seq,
    });
    const newRoom = await RoomModel.update({
      where: { id: msg.channelId },
      data: {
        message: {
          create: [msg],
        },
        updatedAt: new Date(),
        readSeq,
      },
      include: {
        message: {
          include: {
            user: true,
          },
        },
      },
    });
    return newRoom.message[newRoom.message.length - 1];
  }
  return data;
};
