import { IContentType } from "db";
import { TextMsg } from "./TextMsg";
import { MediaMsg } from "./MediaMsg";
import { IMessage } from "@/interfaces/IMessage";

export const MessageTemplate: Record<
  IContentType,
  (message: IMessage) => { component: JSX.Element; preview?: JSX.Element }
> = {
  [IContentType.TEXT_MESSAGE]: TextMsg,
  [IContentType.MEDIA_MESSAGE]: MediaMsg,
  [IContentType.SYSTEM_MESSAGE]: MediaMsg,
  [IContentType.CALL_MESSAGE]: MediaMsg,
  [IContentType.RECALL_MESSAGE]: MediaMsg,
  [IContentType.READ_MESSAGE]: () => ({
    preview: <></>,
    component: <></>,
  }),
};
