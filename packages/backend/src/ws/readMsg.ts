import { IMessage } from "@/interface";
import { RoomModel } from "@/model/room";

export const handleReadMsg = async (data: IMessage) => {
  const room = await RoomModel.update(
    {
      where: { id: data.channelId },
      data: {
        readSeq: {
          [data.readMessage?.operator ?? ""]: data.readMessage?.lastReadSeq,
        },
      },
    }
  );
  console.log(room);
  return room;
};
