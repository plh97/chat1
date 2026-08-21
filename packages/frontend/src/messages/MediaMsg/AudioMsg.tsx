import { formatTime } from "@/utils";
import { IMediaMessage } from "@/core";
import { FaPauseCircle, FaPlayCircle } from "react-icons/fa";
import { audioPlayer, useAudioPlayer } from "./audioPlayer";

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

export const AudioMsg = ({
  message,
  messageId,
}: {
  message: IMediaMessage;
  messageId: string;
}) => {
  const fallbackDuration = message.duration ? Math.ceil(+message.duration) : 0;
  const playerState = useAudioPlayer();
  const isCurrent =
    playerState.messageId === messageId && playerState.src === message.url;
  const current = isCurrent ? playerState.currentTime : 0;
  const duration = isCurrent
    ? Math.ceil(playerState.duration || fallbackDuration)
    : fallbackDuration;
  const playing = isCurrent && playerState.playing;
  const precent = duration ? (current / duration) * 100 : 0;

  return (
    <button
      data-duration={message.duration}
      className="cursor-pointer w-[150px] p-2.5 box-content gap-2 h-6 overflow-hidden select-none flex items-start justify-center"
      style={{
        background: `linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) ${precent}%, transparent 0)`,
      }}
      onClick={() => {
        audioPlayer
          .toggle(messageId, message.url, fallbackDuration)
          .catch(() => {
            // ignore play interruption errors from quick user interactions
          });
      }}
    >
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
