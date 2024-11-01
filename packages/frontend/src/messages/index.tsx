import { IContentType } from "db";
import { TextMsg } from "./TextMsg";
import { MediaMsg } from "./MediaMsg";
import { IMessage } from "@/interfaces/IMessage";
import { SysMsg } from "./SysMsg";
import { IRoom } from "@/interfaces";

export const MessageTemplate: Record<
  IContentType,
  (
          message: IMessage,
    room?: IRoom
  ) => { Component: () => JSX.Element; preview?: JSX.Element }
> = {
  [IContentType.TEXT_MESSAGE]: TextMsg,
  [IContentType.MEDIA_MESSAGE]: MediaMsg,
  [IContentType.SYSTEM_MESSAGE]: SysMsg,
  [IContentType.CALL_MESSAGE]: MediaMsg,
  [IContentType.RECALL_MESSAGE]: MediaMsg,
  [IContentType.READ_MESSAGE]: () => ({
    preview: <></>,
    Component: () => <></>,
  }),
};
