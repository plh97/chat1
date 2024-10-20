import classNames from "classnames";
import {
  CircularProgress,
  SkeletonCircle,
  SkeletonText,
} from "@chakra-ui/react";
import { MessageTemplate } from "@/messages";
import { IMessage } from "@/interfaces/IMessage";

const ReadIndicator = ({ message }: { message: IMessage }) => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const readSeq = room?.readSeq;
  const readPrecent = useMemo(() => {
    const totalUser = room?.member.filter((m) => m.id !== message?.userId);
    const readUser = totalUser.filter((m) => {
      // @ts-ignore
      const userReadSeq = readSeq?.[m?.id];
      return userReadSeq >= message.seq;
    });
    return 100 * (readUser.length / totalUser.length);
  }, [readSeq]);
  if (myUserInfo.id !== message?.userId) return <></>;
  return <CircularProgress size={4} value={readPrecent} />;
};

const Indicator = ({ message }: { message: IMessage }) => {
  return (
    <div className="flex h-full self-end">
      <ReadIndicator message={message} />
    </div>
  );
};

interface IProps {
  data: IMessage;
}
/**
 * Pure Componennt
 *
 * @export
 * @param {IProps} { data }
 * @return {JSX.Element}
 */
export function Item({ data: message }: IProps): JSX.Element {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const isMe = myUserInfo?.id === message?.user?.id;
  const temp = MessageTemplate[message.contentType];
  if (!temp) return <></>;
  const { component } = temp(message);
  return (
    <div
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
