import { IRoom } from "@/interfaces";
import { IMessage } from "@/interfaces/IMessage";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const replaceUserIds = (
  content: string,
  users: Record<string, string>
) => {
  const ids = Object.keys(users)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  if (!ids.length) return content;

  // User IDs are replaced only as complete tokens. This prevents an ID such
  // as "1" from changing the user "11" (or ordinary text containing a digit).
  const matcher = new RegExp(
    `(^|[^\\p{L}\\p{N}_-])(${ids.map(escapeRegExp).join("|")})(?=$|[^\\p{L}\\p{N}_-])`,
    "gu"
  );
  return content.replace(
    matcher,
    (_match, prefix: string, id: string) => `${prefix}${users[id]}`
  );
};

export const formatSystemMessage = (
  content: string,
  room: IRoom | undefined,
  currentUserId: string,
  actionType?: string
) => {
  const idMap: Record<string, string> = {};
  const people = [
    ...(room?.member ?? []),
    ...(room?.admin ?? []),
    ...(room?.creator ? [room.creator] : []),
  ];
  for (const person of people) {
    const id = String(person.id ?? person.userId ?? "");
    if (id) idMap[id] = person.userName;
  }
  if (currentUserId) idMap[String(currentUserId)] = "You";

  // Room names are user-entered text and may themselves contain numbers that
  // happen to equal a user ID. Change-room events only put the actor ID at the
  // beginning, so resolve that token without touching the old/new names.
  if (actionType === "CHANGE_ROOM") {
    return content.replace(
      /^(\d+)(?=\s)/,
      (actorId) => idMap[actorId] ?? actorId
    );
  }
  return replaceUserIds(content, idMap);
};

const Component = ({ message, room }: { message: IMessage; room?: IRoom }) => {
  const me = useAppSelector((state) => state.user.data);
  const sysMsg = message.systemMessage;
  if (!sysMsg?.content) return "invalid system message";
  return formatSystemMessage(sysMsg.content, room, me.id, sysMsg.actionType);
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
