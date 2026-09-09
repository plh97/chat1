import { FiFile, FiX } from "react-icons/fi";
import { getNormalizedMimeType } from "@/utils/uploadFile";

interface IProps {
  readonly handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  readonly text: string;
  readonly maxLength?: number;
  readonly onChange: (text: string) => void;
  readonly attachment?: File | null;
  readonly onRemoveAttachment?: () => void;
  readonly handleSendMessage: () => void;
}

const AttachmentPreview = ({
  file,
  onRemove,
}: {
  file: File;
  onRemove?: () => void;
}) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const isImage = getNormalizedMimeType(file).startsWith("image/");

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  return (
    <div className="flex items-center gap-3 px-3 pt-3">
      <div className="relative flex h-20 w-20 flex-none items-center justify-center overflow-visible rounded-lg bg-gray-700">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name || "Image attachment"}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <FiFile className="text-3xl text-gray-300" />
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove attachment"
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white shadow ring-1 ring-gray-500 hover:bg-gray-700"
        >
          <FiX aria-hidden="true" />
        </button>
      </div>
      <span className="min-w-0 truncate text-sm text-gray-300">
        {file.name || "Attachment"}
      </span>
    </div>
  );
};

export function Input({
  maxLength,
  handlePaste,
  text,
  onChange,
  attachment,
  onRemoveAttachment,
  handleSendMessage,
}: IProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();
  const replyMsg = useAppSelector((state) => state.room.replyMessage);
  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, [location]);
  useLayoutEffect(() => {
    if (replyMsg) {
      inputRef.current?.focus();
    }
  }, [replyMsg]);
  return (
    <div className="relative flex min-h-11 flex-1 flex-col rounded-md border border-gray-600 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
      {attachment ? (
        <AttachmentPreview file={attachment} onRemove={onRemoveAttachment} />
      ) : null}
      <Textarea
        ref={inputRef}
        rows={1}
        minH="42px"
        h="42px"
        resize="none"
        onPaste={handlePaste}
        autoFocus
        value={text}
        onChange={(e) => {
          const res = maxLength
            ? e.target.value.slice(0, maxLength)
            : e.target.value;
          onChange(res);
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (!e.shiftKey && e.key === "Enter") {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        border="none"
        borderRadius="0"
        focusBorderColor="transparent"
        style={{ boxShadow: "none" }}
        aria-label="Message"
        placeholder="Press Enter to send message"
      />
      {maxLength && (
        <span className="absolute right-2 bottom-1">
          {text.length} / {maxLength}
        </span>
      )}
    </div>
  );
}
