import { IMessage } from "@/interface";
import { RoomModel } from "@/model/room";

export const handleSendMsg = async (data: IMessage) => {
  if (
    data.contentType === "TEXT_MESSAGE" ||
    data.contentType === "SYSTEM_MESSAGE" ||
    data.contentType === "MEDIA_MESSAGE"
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
    const newRoom = await RoomModel.update({
      where: { id: msg.channelId },
      data: {
        message: {
          create: [msg as any],
        },
        updatedAt: new Date(),
        readSeq: {
          [msg.userId]: msg.seq,
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
