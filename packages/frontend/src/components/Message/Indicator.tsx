import { IMessage } from "@/interfaces";
import { CircularProgress } from "@chakra-ui/react";
import { retryMessageAction } from "@/store/action/message";
import { AlertCircle, Loader2 } from "lucide-react";

const ReadIndicator = ({ message }: { message: IMessage }) => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const readSeq = room?.readSeq as Record<string, number>;
  const readPrecent = useMemo(() => {
    const totalUser =
      room?.member.filter((m) => m.id !== message?.userId) ?? [];
    if (!totalUser.length) return 0;
    const readUser = totalUser.filter((m) => {
      const id = m?.id;
      const userReadSeq = readSeq[id];
      return userReadSeq >= message.seq;
    });
    return 100 * (readUser.length / totalUser.length);
  }, [readSeq]);
  if (!(room?.member.length > 1)) return <></>;
  if (myUserInfo.userId !== message?.userId) return <></>;
  return <CircularProgress size={4} value={readPrecent} />;
};

const DeliveryIndicator = ({ message }: { message: IMessage }) => {
  const dispatch = useThunkDispatch();

  if (message.localStatus === "sending") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />;
  }

  if (message.localStatus === "failed") {
    return (
      <button
        type="button"
        aria-label="Retry send"
        title="Retry send"
        className="text-red-400 transition hover:text-red-300"
        onClick={() => {
          dispatch(retryMessageAction(message));
        }}
      >
        <AlertCircle className="h-3.5 w-3.5" />
      </button>
    );
  }

  return <ReadIndicator message={message} />;
};

// if from now less than 1 day, show 12:22 PM
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const formatTime = (t: Date): string => {
  return timeFormatter.format(new Date(t));
};

export const Indicator = ({ message }: { message: IMessage }) => {
  return (
    <div className="flex h-full self-end flex-col items-end">
      <span className="text-gray-400	opacity-0 group-hover:opacity-100 text-xs">
        {formatTime(message.createdAt)}
      </span>
      <div className="mt-1 flex min-h-4 items-center">
        <DeliveryIndicator message={message} />
      </div>
    </div>
  );
};
