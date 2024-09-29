import { IMediaMessage } from "core";
import { ProgressImage } from "./ProgressImage";
import { IconButton } from "@chakra-ui/react";
import { FaPlay } from "react-icons/fa";

const useFixedSize = (
  mediaMessage?: IMediaMessage,
  maxWidth = 200,
  maxHeight = 200
) => {
  if (!mediaMessage?.width || !mediaMessage?.height) {
    return { width: 0, height: 0 };
  }
  const rate = mediaMessage.width / mediaMessage.height;
  let width = 0;
  let height = 0;
  if (mediaMessage.width > mediaMessage.height) {
    width = maxWidth;
    height = maxHeight / rate;
  } else {
    height = maxWidth;
    width = maxHeight * rate;
  }
  return {
    width,
    height,
  };
};

export const VideoMsg = ({ message }: { message: IMediaMessage }) => {
  const [playing, setPlaying] = useState(false);
  const thumbnail = message?.thumbnail;
  const { width, height } = useFixedSize(message);
  if (!thumbnail) return <div>Invalid Video</div>;
  return (
    <div
      className="box-content p-2.5 relative overflow-hidden max-w-[200px] max-h-[200px] cursor-pointer select-none flex items-center justify-center"
      style={{ height, width }}
    >
      {playing ? (
        <video controls autoPlay src={message.url} />
      ) : (
        <>
          <span className="absolute">
            <IconButton
              onClick={() => setPlaying(true)}
              aria-label="play button"
              icon={<FaPlay />}
            />
          </span>
          <ProgressImage thumbnail={message.thumbnail} url={message.url} />
        </>
      )}
    </div>
  );
};
