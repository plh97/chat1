import type { ContentType } from "@/interfaces/chat";
import { TextMsg } from "./TextMsg";
import { MediaMsg } from "./MediaMsg";
import { IMessage } from "@/interfaces/IMessage";
import { SysMsg } from "./SysMsg";
import { IRoom } from "@/interfaces";
import { RecallMsg } from "./RecallMsg";

const DefaultMsg = (_message: IMessage, _room?: IRoom) => ({
  Preview: () => <></>,
  Component: () => <></>,
});

export const MessageTemplate: Record<ContentType, typeof DefaultMsg> = {
  ["TEXT_MESSAGE"]: TextMsg,
  ["MEDIA_MESSAGE"]: MediaMsg,
  ["SYSTEM_MESSAGE"]: SysMsg,
  ["RECALL_MESSAGE"]: RecallMsg,
  ["CALL_MESSAGE"]: DefaultMsg,
  ["READ_MESSAGE"]: DefaultMsg,
};
