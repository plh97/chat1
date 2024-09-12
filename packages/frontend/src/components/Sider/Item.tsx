import { AvatarComponnet } from "../Avatar";
import { MessageTemplate } from "@/messages";
import { IRoom, IMessage } from "@/interfaces/IMessage";

interface IProps {
  data: IRoom;
  active: boolean;
  draft?: Partial<IMessage>;
}

export function Item({ data, active, draft }: IProps) {
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
  const containerStyle = active ? " bg-white/10" : "";
  return (
    <li key={data._id?.toString()}>
      <Link
        to={"/room/" + data._id}
        className={
          "flex flex-row items-center overflow-hidden rounded-lg px-2 py-1" +
          containerStyle
        }
      >
        <AvatarComponnet name={data.name} src={data.image} />
        <span className="ml-2 flex-1 inline-flex flex-col leading-4 w-20">
          <span className="font-bold text-base break-all whitespace-nowrap text-ellipsis overflow-hidden leading-4">
            {data.name}
          </span>
          <span className="break-all whitespace-nowrap text-ellipsis overflow-hidden mt-2 text-xs font-normal text-stone-400">
            {textMemo}
          </span>
        </span>
      </Link>
    </li>
  );
}
