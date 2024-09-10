import React from "react";
import { IMessage } from "@chatroom/core";

export const Component = ({ message }: { message: IMessage }) => {
  return <div className="box-content p-2.5">{message.textMessage?.text}</div>;
};

export const TextMsg = (message: IMessage) => {
  return {
    preview: message.textMessage?.text,
    component: <Component message={message} />,
  };
};
