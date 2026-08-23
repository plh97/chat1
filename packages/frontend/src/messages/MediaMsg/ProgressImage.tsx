import { useMediaMsgStyle } from "@/hooks/general";
import { Image } from "@chakra-ui/react";
import { IMediaMessage } from "@/interfaces";

export const ProgressImage = ({
  message,
}: {
  message: Partial<IMediaMessage>;
}) => {
  const { thumbnail, url, file } = message;
  const [loading, setLoading] = useState<boolean>(true);
  const [localPreview, setLocalPreview] = useState("");

  useEffect(() => {
    if (!file) {
      setLocalPreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const isVideo = message.fileType?.startsWith("video");
  const src = isVideo ? url || thumbnail : url || localPreview || thumbnail;
  const fallbackSrc = thumbnail || localPreview || undefined;
  const style =
    message.width && message.height ? useMediaMsgStyle(message) : undefined;
  const shouldBlur = loading || !url;

  if (!src) {
    return (
      <div
        style={style}
        className={clsx(
          "min-h-[80px] min-w-[80px] max-w-[200px] max-h-[200px] bg-slate-700/60 transition-all duration-0",
          {
            "blur-sm": shouldBlur,
          }
        )}
      />
    );
  }

  return (
    <Image
      style={style}
      fallbackSrc={fallbackSrc}
      className={clsx(
        "min-h-[80px] min-w-[80px] max-w-[200px] max-h-[200px] bg-cover object-cover transition-all duration-0",
        {
          "blur-sm": shouldBlur,
        }
      )}
      src={src}
      onLoad={() => {
        setLoading(false);
      }}
    />
  );
};
