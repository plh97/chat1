import { IMessage } from "@/interfaces/IMessage";

export const Component = ({ message }: { message: IMessage }) => {
  return <div className="box-content p-2.5">{message.textMessage?.text}</div>;
};

export const TextMsg = (message: IMessage) => {
  return {
    Preview: () => <>{message.textMessage?.text}</>,
    Component: () => <Component message={message} />,
  };
};
