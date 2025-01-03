import { ProgressImage } from "./ProgressImage";
import { IconButton } from "@chakra-ui/react";
import { FaPlay } from "react-icons/fa";
import { useFixedSize, useMediaMsgStyle } from "@/hooks/general";

export const VideoMsg = ({ message }: { message: IMediaMessage }) => {
  const [playing, setPlaying] = useState(false);
  const thumbnail = message?.thumbnail;
  const { width, height } = useFixedSize(message);
  const style = useMediaMsgStyle(message);
  if (!thumbnail) return <div>Invalid Video</div>;
  return (
    <button
      className="box-content p-2.5 relative overflow-hidden max-w-[200px] max-h-[200px] cursor-pointer select-none flex items-center justify-center"
      style={{ height, width }}
      onClick={() => !playing && setPlaying(true)}
    >
      {playing ? (
        <video style={style} controls autoPlay src={message.url}>
          <track kind="captions" />
        </video>
      ) : (
        <>
          <span className="absolute z-10">
            <IconButton
              as={"span"}
              aria-label="play button"
              icon={<FaPlay />}
            />
          </span>
          <ProgressImage message={{ ...message, url: thumbnail }} />
        </>
      )}
    </button>
  );
};
