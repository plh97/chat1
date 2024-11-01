import { IRoom } from "@/interfaces";
import { IMessage } from "@/interfaces/IMessage";

export const getContent = ({
  message,
  room,
}: {
  message: IMessage;
  room?: IRoom;
}) => {
  const sysMsg = message.systemMessage;
  const member = room?.member;
  const operator = message.user.username;
  const getDefailtContent = () => {
    if (
      sysMsg?.actionType === "ADD_ADMIN" ||
      sysMsg?.actionType === "REMOVE_ADMIN"
    ) {
      return `admin`;
    }
    if (
      sysMsg?.actionType === "ADD_MEMBER" ||
      sysMsg?.actionType === "REMOVE_MEMBER"
    ) {
      return `member`;
    }
    return "";
  };
  const targetListContent =
    sysMsg?.targetList
      .filter((targetId) => {
        return member?.find((m) => m.id === targetId);
      })
      .map((targetId) => {
        return member?.find((m) => m.id === targetId)?.username;
      })
      .join(", ") || getDefailtContent();
  if (!sysMsg) return "un-reconized system message";
  const actionType = sysMsg?.actionType;
  switch (actionType) {
    case "CREATE_ROOM":
      return `"${operator}" create room success`;
    case "REMOVE_ROOM":
      return `"${operator}" remove room success`;
    case "ADD_ADMIN":
      return `"${operator}" add ${targetListContent} as admin`;
    case "REMOVE_ADMIN":
      return `"${operator}" remove ${targetListContent} as admin`;
    case "ADD_MEMBER":
      return `"${operator}" add ${targetListContent} as member`;
    case "REMOVE_MEMBER":
      return `"${operator}" remove ${targetListContent} as member`;
    default:
      return `System message`;
  }
};

export const SysMsg = (message: IMessage, room?: IRoom) => {
  return {
    preview: <>[System]</>,
    Component: () => (
      <div className="text-sm text-gray-400 text-center box-content p-2.5">
        {getContent({ message, room })}
      </div>
    ),
  };
};
