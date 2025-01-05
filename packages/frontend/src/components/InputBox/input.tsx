interface IProps {
  readonly handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  readonly text: string;
  readonly maxLength?: number;
  readonly onChange: (text: string) => void;
  readonly handleSendText: () => void;
}

export function Input({
  maxLength,
  handlePaste,
  text,
  onChange,
  handleSendText,
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
    <div className="relative flex-1 flex">
      <Textarea
        ref={inputRef}
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
            handleSendText();
          }
        }}
        aria-label="maximum height"
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
