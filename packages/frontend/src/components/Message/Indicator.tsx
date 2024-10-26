import { IMessage } from "@/interfaces";
import { CircularProgress } from "@chakra-ui/react";

const ReadIndicator = ({ message }: { message: IMessage }) => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const readSeq = room?.readSeq as Record<string, number>;
  const readPrecent = useMemo(() => {
    const totalUser = room?.member.filter((m) => m.id !== message?.userId);
    const readUser = totalUser.filter((m) => {
      const id = m?.id;
      const userReadSeq = readSeq[id];
      return userReadSeq >= message.seq;
    });
    return 100 * (readUser.length / totalUser.length);
  }, [readSeq]);
  if (myUserInfo.id !== message?.userId) return <></>;
  return <CircularProgress size={4} value={readPrecent} />;
};

export const Indicator = ({ message }: { message: IMessage }) => {
  return (
    <div className="flex h-full self-end">
      <ReadIndicator message={message} />
    </div>
  );
};
