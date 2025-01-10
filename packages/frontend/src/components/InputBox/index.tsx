import { FiSend, FiPause } from "react-icons/fi";
import { IconButton } from "@chakra-ui/react";
import { FaRecordVinyl } from "react-icons/fa";
import { useAppSelector } from "@/hooks/app";
import { scrollToEnd } from "@/store/reducer/room";
import { sendMessageAction } from "@/store/action/message";
import { formatTime, getImgFromClip } from "@/utils";
import { useRecord } from "@/hooks/useRecord";
import { Input } from "./input";
import { IMediaMessage } from "@/interfaces";
import { UploadFile } from "./UploadFile";
import { useDraft } from "./useDraft";
import { Reply } from "../Reply";

const MAX_INPUT = 2000;
const { toast } = createStandaloneToast();

export function InputBox({ className }: { readonly className?: string }) {
  const room = useAppSelector((state) => state.room.data);
  const replyMsg = useAppSelector((state) => state.room.replyMessage);
  const userInfo = useAppSelector((state) => state.user.data);
  const dispatch = useThunkDispatch();
  const [text, setText] = useState("");
  const { startRecording, stopRecording, time } = useRecord();
  useDraft(text, setText);
  const handleSendMedia = (file: File, duration?: string) => {
    if (!userInfo?.id || !room?.id) return;
    dispatch(
      sendMessageAction({
        contentType: "MEDIA_MESSAGE",
        userId: userInfo.id,
        channelId: room.id,
        mediaMessage: {
          file,
          duration: duration ?? null,
        } as IMediaMessage,
      })
    );
  };
  const handlePaste = async () => {
    const file = await getImgFromClip();
    handleSendMedia(file);
  };
  const handleSendText = async () => {
    const trimText = text.trim();
    if (!userInfo.id || !trimText) return;
    setText("");
    const result = await dispatch(
      sendMessageAction({
        contentType: "TEXT_MESSAGE",
        userId: userInfo.id,
        channelId: room.id,
        textMessage: {
          text: trimText,
          mention: [],
        },
      })
    );
    if (sendMessageAction.rejected.match(result)) return;
    dispatch(scrollToEnd());
  };
  const utilComponent = useMemo(() => {
    if (text) {
      return (
        <IconButton
          onClick={handleSendText}
          size="lg"
          variant="solid"
          rounded="full"
          aria-label="Download Image"
          icon={<FiSend className="text-xl" />}
        />
      );
    }
    if (time) {
      return (
        <IconButton
          onClick={async () => {
            const file = await stopRecording();
            handleSendMedia(file, String(time));
          }}
          size="lg"
          variant="solid"
          rounded="full"
          aria-label="Download Image"
          icon={<FiPause className="text-xl" />}
        />
      );
    }
    return (
      <>
        <UploadFile onUpload={(...arg) => handleSendMedia(...arg)} />
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
          aria-label="Download Image"
          icon={<FaRecordVinyl className="text-xl" />}
        />
      </>
    );
  }, [time, text, userInfo, room]);

  const replyMessage = useMemo(() => {
    if (replyMsg) {
      return <Reply onClose message={replyMsg} />;
    }
    return null;
  }, [replyMsg]);

  return (
    <div className={clsx("flex flex-col gap-3 flex-0", className)}>
      {replyMessage}
      <div
        className={clsx(
          "box-border flex flex-row gap-3 flex-0 basis-20 pt-0 pb-5 px-3",
          className
        )}
      >
        {!time ? (
          <Input
            maxLength={MAX_INPUT}
            handlePaste={handlePaste}
            text={text}
            onChange={setText}
            handleSendText={handleSendText}
          />
        ) : (
          <Textarea
            rows={1}
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
