import { IRoom } from "@/interfaces";
import { IMessage } from "@/interfaces/IMessage";

const replaceString = (str: string, data: { [key: string]: string }) => {
  let newStr = str;
  Object.keys(data).forEach((key) => {
    newStr = newStr.replace(new RegExp(`${key}`, "g"), data[key]);
  });
  return newStr;
};

const Component = ({ message, room }: { message: IMessage; room?: IRoom }) => {
  const me = useAppSelector((state) => state.user.data);
  const sysMsg = message.systemMessage;
  const formatSysMessage = (msg: string) => {
    const idMap: Record<string, string> = {};
    Object.entries(room?.member ?? {}).forEach(([_, { id, username }]) => {
      idMap[id] = username;
    });
    return replaceString(msg, {
      ...idMap,
      [me.id]: "You",
    });
  };
  if (!sysMsg?.content) return "invalid system message";
  return formatSysMessage(sysMsg.content);
};

export const SysMsg = (message: IMessage, room?: IRoom) => {
  return {
    Preview: () => <Component message={message} room={room} />,
    Component: () => (
      <div className="text-sm text-gray-400 text-center box-content p-2.5">
        <Component message={message} room={room} />
      </div>
    ),
  };
};
