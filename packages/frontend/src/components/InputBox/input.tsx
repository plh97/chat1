import { FiFile, FiX } from "react-icons/fi";
import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
import { Textarea } from "@/components/ui/chakra-compat";
import { useAppSelector } from "@/hooks/app";
import { getNormalizedMimeType } from "@/utils/uploadFile";

const FINE_POINTER_QUERY = "(pointer: fine)";
const MAX_TEXTAREA_LINES = 5;
const MIN_TEXTAREA_HEIGHT = 42;
const FALLBACK_LINE_HEIGHT = 24;

const cssPixels = (value: string) => Number.parseFloat(value) || 0;

const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) return;

  textarea.style.height = "auto";
  const style = window.getComputedStyle(textarea);
  const lineHeight = cssPixels(style.lineHeight) || FALLBACK_LINE_HEIGHT;
  const padding = cssPixels(style.paddingTop) + cssPixels(style.paddingBottom);
  const border =
    cssPixels(style.borderTopWidth) + cssPixels(style.borderBottomWidth);
  const maxHeight = lineHeight * MAX_TEXTAREA_LINES + padding + border;
  const contentHeight = textarea.scrollHeight + border;
  const nextHeight = Math.min(
    Math.max(contentHeight, MIN_TEXTAREA_HEIGHT),
    maxHeight
  );

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
};

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
  const hasFinePointer = useMediaQuery(FINE_POINTER_QUERY);

  useLayoutEffect(() => {
    if (hasFinePointer) inputRef.current?.focus();
  }, [hasFinePointer, location]);
  useLayoutEffect(() => {
    if (hasFinePointer && replyMsg) {
      inputRef.current?.focus();
    }
  }, [hasFinePointer, replyMsg]);
  useLayoutEffect(() => {
    resizeTextarea(inputRef.current);
  }, [text]);

  return (
    <div className="relative flex min-h-11 flex-1 flex-col rounded-md border border-gray-600 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
      {attachment ? (
        <AttachmentPreview file={attachment} onRemove={onRemoveAttachment} />
      ) : null}
      <Textarea
        ref={inputRef}
        rows={1}
        minH="42px"
        resize="none"
        onPaste={handlePaste}
        autoFocus={hasFinePointer}
        value={text}
        onChange={(e) => {
          const res = maxLength
            ? e.target.value.slice(0, maxLength)
            : e.target.value;
          onChange(res);
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || !hasFinePointer) return;
          if (e.key === "Enter" && !e.shiftKey) {
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
