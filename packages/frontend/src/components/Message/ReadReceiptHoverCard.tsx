import { HoverCard, Portal } from "@/components/ui/chakra-compat";
import type { IMessage, IRoom, IUser } from "@/interfaces";
import { Loader2 } from "lucide-react";
import { getMessageReaders } from "@/utils";
import { loadMessageReaders } from "@/utils/messageReaders";

interface Props {
  children: React.ReactElement;
  message: IMessage;
  room: IRoom;
  readCount: number;
  recipientCount: number;
}

const ReaderAvatar = ({ user }: { user: IUser }) => {
  const initials = (user.userName || "?").slice(0, 2);
  if (user.image) {
    return (
      <img
        src={user.image}
        alt=""
        className="h-6 w-6 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-600 text-[10px] text-white">
      {initials}
    </span>
  );
};

export const ReadReceiptHoverCard = ({
  children,
  message,
  room,
  readCount,
  recipientCount,
}: Props) => {
  const [participants, setParticipants] = useState<IUser[]>([
    ...(room.member ?? []),
    ...(room.admin ?? []),
    ...(room.creator ? [room.creator] : []),
  ]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [readerTotalCount, setReaderTotalCount] = useState(readCount);
  const loadedKeyRef = useRef("");
  const readSeq = (room.readSeq ?? {}) as Record<string, number>;
  const readers = useMemo(
    () => getMessageReaders(message, participants, readSeq),
    [message.seq, message.userId, participants, readSeq]
  );

  const loadReaders = () => {
    if (loading || readCount === 0) return;
    const loadKey = `${room.id}:${message.id}:${readCount}`;
    if (loadedKeyRef.current === loadKey) return;
    setLoading(true);
    setFailed(false);
    loadMessageReaders(String(room.id), String(message.id), readCount)
      .then(({ users, totalCount }) => {
        setParticipants(users);
        setReaderTotalCount(totalCount);
        loadedKeyRef.current = loadKey;
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  return (
    <HoverCard.Root
      openDelay={200}
      closeDelay={100}
      positioning={{ placement: "top" }}
      onOpenChange={({ open }) => {
        if (open) loadReaders();
      }}
    >
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner>
          <HoverCard.Content className="w-56 rounded-lg border border-slate-600 bg-slate-800 p-3 text-white shadow-xl">
            <HoverCard.Arrow>
              <HoverCard.ArrowTip />
            </HoverCard.Arrow>
            <div className="mb-2 text-xs font-semibold text-slate-300">
              Read by {readCount}/{recipientCount}
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading readers…
              </div>
            ) : readCount === 0 ? (
              <p className="text-xs text-slate-400">
                No one has read this message yet.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {readers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <ReaderAvatar user={user} />
                    <span className="min-w-0 truncate text-sm">
                      {user.userName}
                    </span>
                  </div>
                ))}
                {readerTotalCount > readers.length ? (
                  <p className="text-xs text-slate-400">
                    And {readerTotalCount - readers.length} more
                  </p>
                ) : null}
                {failed ? (
                  <p className="text-xs text-red-300">
                    Unable to load all readers.
                  </p>
                ) : null}
              </div>
            )}
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  );
};
