import { IMessage, IRoom } from "@/interface";
import { RoomModel } from "@/model/room";
import { IContentType } from "db";

export const handleSendMsg = async (data: IMessage, room: IRoom) => {
  if (
    data.contentType === IContentType.TEXT_MESSAGE ||
    data.contentType === IContentType.SYSTEM_MESSAGE ||
    data.contentType === IContentType.MEDIA_MESSAGE
  ) {
    const newRoom = await RoomModel.update({
      where: { id: data.channelId },
      data: {
        message: {
          create: [data],
        },
        updatedAt: new Date(),
        readSeq: {
          [data.userId]: data.seq,
        },
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
