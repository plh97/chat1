import { MessageTemplate } from "@/messages";
import { IRoom, IMessage } from "@/interfaces";
import { getRoomDisplay } from "@/utils/roomDisplay";

interface IProps {
  room: IRoom;
  active: boolean;
  myId: string;
  draft?: Partial<IMessage>;
  unreadCount: number;
}

const ItemOriginal = ({ myId, room, active, draft, unreadCount }: IProps) => {
  const location = useLocation();
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
  const { name, image } = getRoomDisplay(room, myId);
  return (
    <li key={room.id}>
      <NavLink
        to={"/room/" + room.id}
        state={{ fromChats: location.pathname === "/" }}
        className={clsx(
          "flex min-h-14 flex-row items-center overflow-hidden rounded-lg px-2 py-1 transition-colors duration-100 hover:bg-white/5 active:bg-white/15",
          { "bg-white/10": active }
        )}
      >
        <Avatar name={name} src={image} count={unreadCount} />
        <span className="ml-2 inline-flex min-w-0 flex-1 flex-col leading-4">
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
