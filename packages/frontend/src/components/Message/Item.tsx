import classNames from "classnames";
import { SkeletonCircle, SkeletonText } from "@chakra-ui/react";
import { MessageTemplate } from "@/messages";
import { IMessage } from "@/interfaces/IMessage";
import { Indicator } from "./Indicator";
import { markReadMessageThunk } from "@/store/action/message";
import { IContentType } from "db";

interface IProps {
  data: IMessage;
}

let timer: NodeJS.Timeout;
const debounce = (fn: Function, delay = 100) => {
  return (...args: any) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

const useMsgWatch = (message: IMessage) => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const readSeq = room?.readSeq;
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.5,
  });
  const dispatch = useAppDispatch();
  const debounceRead = debounce(() => {
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
  }, 100);
  useEffect(() => {
    debounceRead();
  }, [readSeq, isIntersecting]);
  return ref;
};

export function Item({ data: message }: IProps): JSX.Element {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const isMe = myUserInfo?.id === message?.user?.id;
  const temp = MessageTemplate[message.contentType];
  if (!temp) return <></>;
  const { Component } = temp(message, room);
  const ref = useMsgWatch(message);
  if (message.contentType === IContentType.SYSTEM_MESSAGE) {
    return <Component />;
  }
  return (
    <div
      ref={ref}
      data-seq={message.seq}
      className={classNames("group relative flex flex-row items-start mb-2", {
        "flex-row-reverse": isMe,
      })}
    >
      <AvatarComponnet
        size="md"
        name={message?.user?.username}
        src={message?.user?.image}
      />
      <div className="mx-2.5 max-w-[60%] rounded-lg overflow-hidden whitespace-pre-wrap bg-gray-800 shadow-md">
        <Component />
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
