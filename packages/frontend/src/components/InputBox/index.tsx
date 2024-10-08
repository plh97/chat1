import { IContentType } from "db";
import { useAppSelector } from "@/hooks/app";
import { scrollToEnd } from "@/store/reducer/room";
import { sendMessageAction } from "@/store/action/message";
import { formatTime, getImgFromClip } from "@/utils";
import { FiSend, FiPause } from "react-icons/fi";
import { IconButton } from "@chakra-ui/react";
import { FaRecordVinyl } from "react-icons/fa";
import { useRecord } from "@/hooks/useRecord";
import { Input } from "./input";
import { IMediaMessage } from "@/interfaces";
import { UploadFile } from "./UploadFile";
import { useDraft } from "./useDraft";

const MAX_INPUT = 2000;
const { toast } = createStandaloneToast();

export function InputBox() {
  const { id = "" } = useParams();
  const dispatch = useThunkDispatch();
  const [text, setText] = useState("");
  const { startRecording, stopRecording, time } = useRecord();
  const { data: userInfo } = useAppSelector((state) => state.user);
  useDraft(text, setText);
  const handleSendMedia = async (file: File, duration?: string) => {
    await dispatch(
      sendMessageAction({
        contentType: IContentType.MEDIA_MESSAGE,
        userId: userInfo.id,
        channelId: id,
        createdAt: new Date(),
        seq: 0,
        mediaMessage: {
          file,
          duration: duration ?? null,
        } as IMediaMessage,
      })
    );
    dispatch(scrollToEnd());
  };
  const handlePaste = async () => {
    const file = await getImgFromClip();
    handleSendMedia(file);
  };
  const handleSendText = async () => {
    const _text = text.trim();
    if (!userInfo.id || !_text) return;
    await dispatch(
      sendMessageAction({
        contentType: IContentType.TEXT_MESSAGE,
        userId: userInfo.id,
        channelId: id,
        createdAt: new Date(),
        seq: 0,
        textMessage: {
          text: _text,
          methion: [],
        },
      })
    );
    setText("");
    dispatch(scrollToEnd());
  };
  const UtilMome = useMemo(() => {
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
        <UploadFile onUpload={handleSendMedia} />
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
  }, [time, text]);

  return (
    <div className="box-border flex flex-row gap-3 flex-0 basis-20 pt-0 pb-5 px-3">
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
      {UtilMome}
    </div>
  );
}
