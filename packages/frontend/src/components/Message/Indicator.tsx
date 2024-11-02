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
  if (!(room?.member.length > 1)) return <></>;
  if (myUserInfo.id !== message?.userId) return <></>;
  return <CircularProgress size={4} value={readPrecent} />;
};

// if from now less than 1 day, show 12:22 PM
const formatTime = (t: Date): string => {
  return moment(t).format("hh:mm A");
};

export const Indicator = ({ message }: { message: IMessage }) => {
  return (
    <div className="flex h-full self-end flex-col items-end">
      <span className="text-gray-400	opacity-0 group-hover:opacity-100 text-xs">{formatTime(message.createdAt)}</span>
      <ReadIndicator message={message} />
    </div>
  );
};
