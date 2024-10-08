interface IProps {
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  text: string;
  maxLength?: number;
  onChange: (text: string) => void;
  handleSendText: () => void;
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
  useEffect(() => {
    inputRef.current?.focus();
  }, [location]);
  return (
    <div className="relative flex-1 flex">
      <Textarea
        ref={inputRef}
        rows={1}
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
