import { AvatarComponnet } from "../Avatar";
import { MessageTemplate } from "@/messages";
import { IRoom, IMessage } from "@/interfaces";
import { cn } from "@/utils";

interface IProps {
  room: IRoom;
  active: boolean;
  myId: string;
  draft?: Partial<IMessage>;
  unreadCount: number;
}

const ItemOriginal = ({ myId, room, active, draft, unreadCount }: IProps) => {
  const textMemo = useMemo(() => {
    if (draft) {
      return (
        <>
          <span className="font-bold text-red-500">Draft:</span>
          {draft.textMessage?.text}
        </>
      );
    }
    try {
      const msg = room.lastMsg;
      if (!msg) return "-";
      const Preview = MessageTemplate[msg.contentType](msg, room)?.Preview;
      if (!Preview) return "-";
      return <Preview />;
    } catch (error) {
      return "unknown message";
    }
  }, [room, draft]);
  let name = room.name;
  let image = room.image!;
  if (room.channelType === "PRIVATE") {
    const user = room.member?.find((u) => u.id !== myId);
    if (user) {
      image = user.image;
      name = user.username;
    }
  }
  return (
    <li key={room.id}>
      <NavLink
        to={"/room/" + room.id}
        className={cn(
          "flex flex-row items-center overflow-hidden rounded-lg px-2 py-1",
          { "bg-white/10": active }
        )}
      >
        <AvatarComponnet name={name} src={image} count={unreadCount} />
        <span className="ml-2 flex-1 inline-flex flex-col leading-4 w-20">
          <span className="font-bold text-base break-all whitespace-nowrap text-ellipsis overflow-hidden leading-4">
            {name}
          </span>
          <span className="break-all whitespace-nowrap text-ellipsis overflow-hidden mt-2 text-xs font-normal text-stone-400">
            {textMemo}
          </span>
        </span>
      </NavLink>
    </li>
  );
};

export const Item = memo(ItemOriginal);
