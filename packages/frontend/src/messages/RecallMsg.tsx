import { IRoom } from "@/interfaces";
import { IMessage } from "@/interfaces/IMessage";

const Component = ({ message, room }: { message: IMessage; room?: IRoom }) => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const recallMsg = message.recallMessage;
  if (recallMsg?.operator === myUserInfo.id) {
    return `You recall this message`;
  }
  const member = room?.member ?? [];
  const operator =
    member.find((m) => m.id === recallMsg?.operator)?.username ??
    recallMsg?.operator ??
    "operator";
  if (!recallMsg) return "un-reconized system message";
  return `"${operator}" recall this message`;
};

export const RecallMsg = (message: IMessage, room?: IRoom) => {
  return {
    Preview: () => <Component message={message} room={room} />,
    Component: () => (
      <div className="text-sm text-gray-400 text-center box-content p-2.5">
        <Component message={message} room={room} />
      </div>
    ),
  };
};
