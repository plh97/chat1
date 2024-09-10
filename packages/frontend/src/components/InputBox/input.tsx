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
  return (
    <div className="relative flex-1 flex">
      <Textarea
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
          if (e.metaKey && e.key === "Enter") {
            handleSendText();
          }
        }}
        aria-label="maximum height"
        placeholder="Command + Enter to send message"
      />
      {maxLength && (
        <span className="absolute right-2 bottom-1">
          {text.length} / {maxLength}
        </span>
      )}
    </div>
  );
}
