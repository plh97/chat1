import { IRoom } from "@/interfaces";
import { IMessage } from "@/interfaces/IMessage";

const Component = ({ message, room }: { message: IMessage; room?: IRoom }) => {
  const me = useAppSelector((state) => state.user.data);
  const sysMsg = message.systemMessage;
  const member = room?.member ?? [];
  const getOperator = () => {
    if (sysMsg?.operator === me.id) {
      return `You`;
    }
    const username = member.find((m) => m.id === sysMsg?.operator)?.username;
    if (username) {
      return `"${username}"`;
    }
    return sysMsg?.operator ?? "Operator";
  };
  const targetListContent =
    sysMsg?.targetList
      .filter((targetId) => {
        return member?.find((m) => m.id === targetId);
      })
      .map((targetId) => {
        if (targetId === me.id) {
          return "You";
        }
        return member?.find((m) => m.id === targetId)?.username;
      })
      .join(", ") ??
    JSON.stringify(sysMsg?.targetList) ??
    "???";
  if (!sysMsg) return "un-reconized system message";
  const actionType = sysMsg?.actionType;
  switch (actionType) {
    case "CREATE_ROOM":
      return `${getOperator()} create room success!`;
    case "REMOVE_ROOM":
      return `${getOperator()} remove room success!`;
    case "ADD_ADMIN":
      return `${getOperator()} add ${targetListContent} as admin!`;
    case "REMOVE_ADMIN":
      return `${getOperator()} remove ${targetListContent} as admin!`;
    case "ADD_MEMBER":
      return `${getOperator()} add ${targetListContent} as member!`;
    case "REMOVE_MEMBER":
      return `${getOperator()} remove ${targetListContent} as member!`;
    case "ADD_FRIEND":
      return `${getOperator()} and ${targetListContent} are friends now!`;
    default:
      return `System message`;
  }
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
