import { IContentType, IMessage } from "@chatroom/core";
import { TextMsg } from "./TextMsg";
import { MediaMsg } from "./MediaMsg";

export const MessageTemplate: Record<
  IContentType,
  (message: IMessage) => { component: JSX.Element; preview?: string }
> = {
  [IContentType.TEXT_MESSAGE]: TextMsg,
  [IContentType.MEDIA_MESSAGE]: MediaMsg,
  [IContentType.SYSTEM_MESSAGE]: MediaMsg,
  [IContentType.CALL_MESSAGE]: MediaMsg,
};
