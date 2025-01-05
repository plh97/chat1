import { ProgressImage } from "./ProgressImage";
import { IconButton } from "@chakra-ui/react";
import { FaPlay } from "react-icons/fa";
import { useFixedSize, useMediaMsgStyle } from "@/hooks/general";

export const VideoMsg = ({ message }: { message: IMediaMessage }) => {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnail = message?.thumbnail;
  const { width, height } = useFixedSize(message);
  const style = useMediaMsgStyle(message);
  if (!thumbnail) return <div>Invalid Video</div>;
  return (
    <button
      className="box-content p-2.5 relative overflow-hidden max-w-[200px] max-h-[200px] cursor-pointer select-none flex items-center justify-center"
      style={{ height, width }}
      onClick={() => {
        !playing && setPlaying(true);
        videoRef.current?.play();
      }}
    >
      <video
        className="absolute"
        preload="metadata"
        ref={videoRef}
        style={{
          ...style,
          visibility: playing ? "visible" : "hidden",
        }}
        controls
        // autoPlay
        src={message.url}
      >
        <track kind="captions" />
      </video>
      {!playing && (
        <>
          <IconButton
            className="!absolute z-10"
            as={"span"}
            aria-label="play button"
            icon={<FaPlay />}
          />
          <ProgressImage message={{ ...message, url: thumbnail }} />
        </>
      )}
    </button>
  );
};
