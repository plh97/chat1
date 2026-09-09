import { IMessage } from "@/interfaces";
import React from "react";
import { retryMessageAction } from "@/store/action/message";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getMessageReadProgress, getRoomParticipantCount } from "@/utils";
import { ReadReceiptHoverCard } from "./ReadReceiptHoverCard";

const ReadStatusIcon = React.forwardRef<
  HTMLSpanElement,
  { percentage: number; label: string }
>(({ percentage, label }, ref) => {
  const progress = Math.min(100, Math.max(0, percentage));
  const radius = 7.5;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      ref={ref}
      role="img"
      aria-label={label}
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
    >
      {progress >= 100 ? (
        <CheckCircle2
          aria-hidden="true"
          className="h-4 w-4 stroke-[2.5] text-teal-400"
        />
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 -rotate-90 overflow-visible"
        >
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-slate-500"
          />
          {progress > 0 ? (
            <circle
              cx="10"
              cy="10"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              className="text-teal-400 transition-[stroke-dashoffset] duration-200"
            />
          ) : null}
        </svg>
      )}
    </span>
  );
});
ReadStatusIcon.displayName = "ReadStatusIcon";

const ReadIndicator = ({ message }: { message: IMessage }) => {
  const room = useAppSelector((state) => state.room.data);
  const readProgress = useMemo(
    () =>
      getMessageReadProgress(
        message,
        [...(room?.member ?? []), ...(room?.admin ?? [])],
        (room?.readSeq ?? {}) as Record<string, number>,
        getRoomParticipantCount(room)
      ),
    [
      message.seq,
      message.userId,
      room?.admin,
      room?.adminTotalCount,
      room?.creator,
      room?.member,
      room?.memberTotalCount,
      room?.participantTotalCount,
      room?.readSeq,
    ]
  );
  if (!readProgress.recipientCount) return null;
  const readLabel = `${readProgress.readCount}/${readProgress.recipientCount} read`;
  return (
    <ReadReceiptHoverCard
      message={message}
      room={room}
      readCount={readProgress.readCount}
      recipientCount={readProgress.recipientCount}
    >
      <ReadStatusIcon percentage={readProgress.percentage} label={readLabel} />
    </ReadReceiptHoverCard>
  );
};

const DeliveryIndicator = ({
  message,
  isMine,
}: {
  message: IMessage;
  isMine: boolean;
}) => {
  const dispatch = useThunkDispatch();

  if (!isMine) return null;

  if (message.localStatus === "sending") {
    return (
      <Loader2
        aria-label="Sending"
        className="h-4 w-4 animate-spin stroke-2 text-gray-400"
      />
    );
  }

  if (message.localStatus === "failed") {
    return (
      <button
        type="button"
        aria-label="Retry send"
        title="Retry send"
        className="flex h-4 w-4 items-center justify-center text-red-400 transition hover:text-red-300"
        onClick={() => {
          dispatch(retryMessageAction(message));
        }}
      >
        <AlertCircle className="h-4 w-4 stroke-2" />
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

export const Indicator = ({
  message,
  isMine,
}: {
  message: IMessage;
  isMine: boolean;
}) => {
  return (
    <div className="flex h-full self-end flex-col items-end">
      <span className="text-gray-400	opacity-0 group-hover:opacity-100 text-xs">
        {formatTime(message.createdAt)}
      </span>
      <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
        <DeliveryIndicator message={message} isMine={isMine} />
      </div>
    </div>
  );
};
