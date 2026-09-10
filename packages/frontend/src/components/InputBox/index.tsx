import { FiSend, FiPause } from "react-icons/fi";
import { IconButton } from "@/components/ui/chakra-compat";
import { FaRecordVinyl } from "react-icons/fa";
import { useAppSelector } from "@/hooks/app";
import { joinRoomThunk, scrollToEnd } from "@/store/reducer/room";
import { sendMessageAction } from "@/store/action/message";
import {
  formatTime,
  getFileFromClipboardEvent,
  SUPPORTED_MEDIA_TYPES,
} from "@/utils";
import { useRecord } from "@/hooks/useRecord";
import { Input } from "./input";
import { IMediaMessage } from "@/interfaces";
import { UploadFile } from "./UploadFile";
import { useDraft } from "./useDraft";
import { Reply } from "../Reply";
import { Link } from "@/components/ui/chakra-compat";
import { getFileExtension, getNormalizedMimeType } from "@/utils/uploadFile";

const MAX_INPUT = 2000;
const { toast } = createStandaloneToast();

export function InputBox({ className }: { readonly className?: string }) {
  const { data: room, id: requestedRoomId } = useAppSelector(
    (state) => state.room
  );
  const replyMsg = useAppSelector((state) => state.room.replyMessage);
  const userInfo = useAppSelector((state) => state.user.data);
  const dispatch = useThunkDispatch();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const { startRecording, stopRecording, time } = useRecord();
  useDraft(text, setText);

  useEffect(() => {
    setAttachment(null);
  }, [room.id]);

  const handleSendMedia = (file: File, duration?: string, caption?: string) => {
    if (!userInfo?.id || !room?.id) return;
    return dispatch(
      sendMessageAction({
        contentType: "MEDIA_MESSAGE",
        userId: userInfo.id,
        channelId: room.id,
        textMessage: caption
          ? {
              text: caption,
              mention: [],
            }
          : null,
        mediaMessage: {
          file,
          url: "",
          name: file.name ?? "",
          size: file.size ?? 0,
          extension: getFileExtension(file),
          fileType: getNormalizedMimeType(file),
          duration: duration ?? null,
          thumbnail: null,
          width: null,
          height: null,
        } as IMediaMessage,
      })
    );
  };
  const handlePaste = async (
    event: React.ClipboardEvent<HTMLTextAreaElement>
  ) => {
    const file = await getFileFromClipboardEvent(event.nativeEvent, [
      ...SUPPORTED_MEDIA_TYPES.image,
      ...SUPPORTED_MEDIA_TYPES.video,
    ]);
    if (!file) return;
    event.preventDefault();
    setAttachment(file);
  };

  const sendMsg = (text: string) => {
    return dispatch(
      sendMessageAction({
        contentType: "TEXT_MESSAGE",
        userId: userInfo.id,
        channelId: room.id,
        textMessage: {
          text,
          mention: [],
        },
      })
    );
  };
  const handleSendMessage = async () => {
    const trimText = text.trim();
    if (!userInfo.id || !room.id || (!trimText && !attachment)) return;

    const pendingAttachment = attachment;
    setText("");
    setAttachment(null);

    const result = pendingAttachment
      ? await handleSendMedia(pendingAttachment, undefined, trimText)
      : await sendMsg(trimText);
    if (!result) return;
    if (sendMessageAction.rejected.match(result)) return;
    dispatch(scrollToEnd(false));
  };
  let utilComponent: React.ReactNode;
  if (time) {
    utilComponent = (
      <IconButton
        onClick={async () => {
          const file = await stopRecording();
          handleSendMedia(file, String(time));
        }}
        size="lg"
        variant="solid"
        rounded="full"
        aria-label="Stop recording and send"
      >
        <FiPause className="text-xl" />
      </IconButton>
    );
  } else {
    utilComponent = (
      <>
        <UploadFile onUpload={setAttachment} />
        {text || attachment ? (
          <IconButton
            onClick={handleSendMessage}
            size="lg"
            variant="solid"
            rounded="full"
            aria-label="Send message"
          >
            <FiSend className="text-xl" />
          </IconButton>
        ) : (
          <IconButton
            onClick={async () => {
              startRecording().catch((e) => {
                toast({
                  description: e.message,
                  status: "error",
                  position: "top",
                  duration: 1000,
                });
              });
            }}
            size="lg"
            variant="solid"
            rounded="full"
            aria-label="Start recording"
          >
            <FaRecordVinyl className="text-xl" />
          </IconButton>
        )}
      </>
    );
  }

  const replyMessage = useMemo(() => {
    if (replyMsg) {
      return <Reply onClose message={replyMsg} />;
    }
    return null;
  }, [replyMsg]);
  const isRoomMember =
    room.isMember ?? room.member.find((m) => m.id === userInfo.id);
  const handleJoinRoom = () => {
    dispatch(joinRoomThunk({ id: room.id }));
  };
  const roomIsReady = Boolean(
    room.id && (!requestedRoomId || String(room.id) === String(requestedRoomId))
  );
  if (!roomIsReady) {
    return (
      <div
        aria-hidden="true"
        className={clsx("safe-px flex flex-none flex-col", className)}
      >
        <div className="safe-pb box-border min-h-20 flex-none" />
      </div>
    );
  }
  if (!isRoomMember) {
    return (
      <div className={clsx("safe-px flex flex-col gap-3 flex-0", className)}>
        <div className="safe-pb box-border flex min-h-20 flex-none flex-row gap-3 pt-0">
          you are not room member,{" "}
          <Link color="teal.500" className="font-bold" onClick={handleJoinRoom}>
            Join it
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("safe-px flex flex-col gap-3 flex-0", className)}>
      {replyMessage}
      <div className="safe-pb box-border flex min-h-20 flex-none flex-row items-end gap-3 pt-0">
        {!time ? (
          <Input
            maxLength={MAX_INPUT}
            handlePaste={handlePaste}
            text={text}
            onChange={setText}
            attachment={attachment}
            onRemoveAttachment={() => setAttachment(null)}
            handleSendMessage={handleSendMessage}
          />
        ) : (
          <Textarea
            rows={1}
            minH="11"
            h="11"
            resize="none"
            disabled
            value={formatTime(time)}
            className="flex-1 text-right"
            aria-label="maximum height"
          />
        )}
        {utilComponent}
      </div>
    </div>
  );
}
