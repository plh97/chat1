import { ROOM } from "@/interfaces/IRoom";
import { AvatarComponnet } from "../Avatar";
import { MessageTemplate } from "@/messages";
import { IMessage } from "@chatroom/core";

interface IProps {
  data: ROOM;
  active: boolean;
}

export function Item(props: IProps) {
  const { data } = props;
  const textMemo = useMemo(() => {
    try {
      const msg = props.data.lastMsg as IMessage;
      if (!msg) return "-";
      return MessageTemplate[msg.contentType](msg)?.preview ?? '-';
    } catch (error) {
      return "unknown message";
    }
  }, [props.data]);
  const containerStyle = props.active ? " bg-white/10" : "";
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
