import { FileIcon } from "@/messages/MediaMsg/DocsMsg";
import { updateReplyMessage } from "@/store/reducer/room";
import { FaRegWindowClose } from "react-icons/fa";

interface IProps {
  message: IMessage;
  className?: string;
  onClose?: any;
  onClick?: (m: IMessage) => void;
}

export const Reply = ({ message, className, onClose, onClick }: IProps) => {
  const dispatch = useThunkDispatch();
  const content = useMemo(() => {
    try {
      if (message.contentType === "TEXT_MESSAGE") {
        return message.textMessage?.text;
      }
      if (message.contentType === "MEDIA_MESSAGE") {
        const mediaMsg = message.mediaMessage!;
        return (
          <span className="inline-flex flex-row items-center gap-1">
            <FileIcon
              type={mediaMsg.fileType}
              className="flex-initial text-md"
            />
            {mediaMsg.name}
          </span>
        );
      }
      return "???";
    } catch (error) {
      return "???";
    }
  }, [message]);
  if (!message) return null;
  return (
    <div
      className={clsx(
        className,
        "flex flex-row relative box-border mx-3 rounded-lg overflow-hidden items-center gap-4 bg-[rgba(149,92,219,0.1)] pr-4 "
      )}
    >
      <span className="absolute left-0 top-0 bottom-0 flex w-1 z-1 bg-[rgb(149,92,219)]" />
      <button
        onClick={() => onClick?.(message)}
        className="select-none pl-3 py-2 flex-1 flex flex-col w-[calc(100%-100px)]"
      >
        <span className="w-full text-sm text-gray-500 font-bold break-all whitespace-nowrap text-ellipsis overflow-hidden">
          {onClose && "Reply: "}
          {message.user?.username}
        </span>
        <span className="w-full text-sm text-gray-500 mt-1 break-all whitespace-nowrap text-ellipsis overflow-hidden">
          {content}
        </span>
      </button>
      {onClose && (
        <IconButton
          size="sm"
          aria-label="Remove Reply"
          onClick={() => dispatch(updateReplyMessage())}
          icon={<FaRegWindowClose className="text-gray-500" />}
        />
      )}
    </div>
  );
};
