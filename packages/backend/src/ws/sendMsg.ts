import { IMessage } from "@/interface";
import { RoomModel } from "@/model/room";
import { isMember } from "@/utils/room";

export const handleSendMsg = async (data: IMessage) => {
  if (
    data.contentType !== "TEXT_MESSAGE" &&
    data.contentType !== "SYSTEM_MESSAGE" &&
    data.contentType !== "MEDIA_MESSAGE"
  ) {
    return { data };
  }
  if (!(await isMember(data))) {
    return {
      data: null,
      code: 1,
      message: "you are not the member in this room",
    };
  }
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
          reply: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });
  const lastMsg = newRoom.message[newRoom.message.length - 1];
  return {
    data: lastMsg,
    code: 0,
  };
};
