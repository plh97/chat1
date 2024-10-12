import { AvatarComponnet } from "../Avatar";
import { MessageTemplate } from "@/messages";
import { IRoom, IUser, IMessage } from "@/interfaces";
import { cn } from "@/utils";

interface IProps {
  data: IRoom;
  active: boolean;
  draft?: Partial<IMessage>;
}

export function Item({ data, active, draft }: IProps) {
  const myUserInfo = useAppSelector<Partial<IUser>>((state) => {
    return state.user.data;
  });
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
      const msg = data.lastMsg;
      if (!msg) return "-";
      return MessageTemplate[msg.contentType](msg)?.preview ?? "-";
    } catch (error) {
      return "unknown message";
    }
  }, [data, draft]);
  const readSeq = data.readSeq?.[myUserInfo?.id!] ?? 0;
  const count = data.totalCount - readSeq;
  return (
    <li data-read-seq={readSeq} key={data.id}>
      <NavLink
        to={"/room/" + data.id}
        className={cn(
          "flex flex-row items-center overflow-hidden rounded-lg px-2 py-1",
          {
            "bg-white/10": active,
          }
        )}
      >
        <AvatarComponnet name={data.name} src={data.image!} count={count} />
        <span className="ml-2 flex-1 inline-flex flex-col leading-4 w-20">
          <span className="font-bold text-base break-all whitespace-nowrap text-ellipsis overflow-hidden leading-4">
            {data.name}
          </span>
          <span className="break-all whitespace-nowrap text-ellipsis overflow-hidden mt-2 text-xs font-normal text-stone-400">
            {textMemo}
          </span>
        </span>
      </NavLink>
    </li>
  );
}
