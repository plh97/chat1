import { IMessage } from "@/interface";
import { RoomModel } from "@/model/room";

export const handleReadMsg = async (message: IMessage) => {
  if (!message.readMessage?.lastReadSeq || !message?.readMessage?.operator)
    return;
  const _room = await RoomModel.findUnique({
    where: { id: message.channelId },
  });
  if (!_room) return;
  const readSeq: any = _room?.readSeq ?? {};
  if (
    readSeq[message?.readMessage?.operator] === undefined ||
    readSeq[message?.readMessage?.operator] < message.readMessage.lastReadSeq
  ) {
    Object.assign(readSeq, {
      ...readSeq,
      [message?.readMessage?.operator]: message.readMessage?.lastReadSeq,
    });
  }
  await RoomModel.update({
    where: { id: message.channelId },
    data: {
      readSeq: readSeq,
    },
  });
  return {
    ...message,
    readMessage: {
      ...message.readMessage,
      readSeq: readSeq,
    }
  } as IMessage;
};
