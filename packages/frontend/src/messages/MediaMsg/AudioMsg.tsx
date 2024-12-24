import { formatTime } from "@/utils";
import { IMediaMessage } from "core";
import { FaPauseCircle, FaPlayCircle } from "react-icons/fa";

export function formatFileSize(size?: number) {
  if (!size) return "0 Byte";
  if (size > 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(0)} MB`;
  }
  if (size > 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }
  return `${size.toFixed(0)} Byte`;
}

export const AudioMsg = ({ message }: { message: IMediaMessage }) => {
  const duration = message.duration ? Math.ceil(+message.duration) : 0;
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const precent = (current / duration) * 100;
  return (
    <button
      data-duration={message.duration}
      className="cursor-pointer w-[150px] p-2.5 box-content gap-2 h-6 overflow-hidden select-none flex items-start justify-center"
      style={{
        background: `linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) ${precent}%, transparent 0)`,
      }}
      onClick={() => {
        if (playing) {
          setPlaying(false);
          audioRef.current?.pause();
        } else {
          setPlaying(true);
          audioRef.current?.play();
        }
      }}
    >
      <audio
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={() => {
          setCurrent(audioRef.current?.currentTime ?? 0);
        }}
        ref={audioRef}
        src={message.url}
        className="hidden"
      />
      {playing ? (
        <FaPauseCircle className="h-6 flex-initial text-2xl" />
      ) : (
        <FaPlayCircle className="h-6 flex-initial text-2xl" />
      )}
      <div className="flex-1 text-xs w-[calc(100%-100px)]">
        <div className="text-base font-bold">
          {formatTime(Math.ceil(current))} / {formatTime(duration)}
        </div>
      </div>
    </button>
  );
};
