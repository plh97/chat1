import { IMessage } from "@/interface";
import { RoomModel } from "@/model/room";

export const isMember = async (msg: IMessage) => {
  const room = await RoomModel.findUnique({
    where: {
      id: msg.channelId,
      memberId: {
        has: msg.userId,
      },
    },
  });
  return !!room;
};
