import type { IContentType } from "db";
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
  ["TEXT_MESSAGE"]: TextMsg,
  ["MEDIA_MESSAGE"]: MediaMsg,
  ["SYSTEM_MESSAGE"]: SysMsg,
  ["CALL_MESSAGE"]: MediaMsg,
  ["RECALL_MESSAGE"]: MediaMsg,
  ["READ_MESSAGE"]: () => ({
    preview: <></>,
    Component: () => <></>,
  }),
};
