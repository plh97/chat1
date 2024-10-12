import { IMessage, IRoom } from "@/interface";
import { MessageModel } from "@/model/message";
import { RoomModel } from "@/model/room";
import { UserModel } from "@/model/user";
import { IContentType } from "db";

export const handleSendMsg = async (data: IMessage, room: IRoom) => {
  if (
    data.contentType === IContentType.TEXT_MESSAGE ||
    data.contentType === IContentType.SYSTEM_MESSAGE ||
    data.contentType === IContentType.MEDIA_MESSAGE
  ) {
    // const seq = room?.messageId.length;
    // const message = await MessageModel.create({
    //   data,
    //   // data: { ...data, seq: seq ?? 0 + 1 },
    // });
    // await message.populate("user");
    // console.log(1111, message);

    const newRoom = await RoomModel.update({
      where: { id: data.channelId },
      data: {
        message: {
          create: [data],
        },
        updatedAt: new Date(),
        // readSeq: {
        //   [data.user.id]: data.seq,
        // },
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
