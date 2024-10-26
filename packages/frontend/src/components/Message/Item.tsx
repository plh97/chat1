import classNames from "classnames";
import { SkeletonCircle, SkeletonText } from "@chakra-ui/react";
import { MessageTemplate } from "@/messages";
import { IMessage } from "@/interfaces/IMessage";
import { Indicator } from "./Indicator";
import { markReadMessageThunk } from "@/store/action/message";

interface IProps {
  data: IMessage;
}

const useMsgWatch = (message: IMessage) => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const readSeq = room?.readSeq;
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.5,
  });

  const dispatch = useAppDispatch();
  useEffect(() => {
    const readSeqMap = room.readSeq as Record<string, number>;
    const isRead = readSeqMap[myUserInfo.id] >= message.seq;
    const isMyMsg = myUserInfo.id === message.userId;
    if (!isRead && isIntersecting && !isMyMsg) {
      dispatch(
        markReadMessageThunk({
          channelId: room.id,
          readMessage: {
            operator: myUserInfo.id,
            lastReadSeq: message.seq,
          },
        })
      );
    }
  }, [readSeq, isIntersecting]);
  return ref;
};

export function Item({ data: message }: IProps): JSX.Element {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const isMe = myUserInfo?.id === message?.user?.id;
  const temp = MessageTemplate[message.contentType];
  if (!temp) return <></>;
  const { component } = temp(message);
  const ref = useMsgWatch(message);
  return (
    <div
      ref={ref}
      data-seq={message.seq}
      className={classNames("relative flex flex-row items-start mb-2", {
        "flex-row-reverse": isMe,
      })}
    >
      <AvatarComponnet
        size="md"
        name={message?.user?.username}
        src={message?.user?.image}
      />
      <div className="mx-2.5 max-w-[60%] rounded-lg overflow-hidden whitespace-pre-wrap bg-gray-800 shadow-md">
        {component}
      </div>
      <Indicator message={message} />
    </div>
  );
}

export function SkeletonItem({ isMe = false }: { isMe?: boolean }) {
  return (
    <div
      className={classNames("relative flex flex-row items-start mb-2", {
        "flex-row-reverse": isMe,
      })}
    >
      <SkeletonCircle size="10" />
      <span className="mx-2.5 max-w-[60%] rounded-lg whitespace-pre-wrap shadow-md">
        <SkeletonText
          className="flex-1 w-[200px] text-right rounded-lg overflow-hidden"
          mr="2"
          noOfLines={1}
          spacing="2"
          skeletonHeight="10"
        />
      </span>
    </div>
  );
}
