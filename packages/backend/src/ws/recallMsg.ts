import { IMessage } from "@/interface";
import { MessageModel } from "@/model/message";

export const handleRecallMsg = async (data: IMessage) => {
  if (data.contentType === "RECALL_MESSAGE") {
    const message = await MessageModel.update({
      where: { id: data.recallMessage?.recallMsgId! },
      data: {
        contentType: "RECALL_MESSAGE",
        recallMessage: data.recallMessage,
      },
    });
    return message;
  }
  return data;
};
