import { useMediaMsgStyle } from "@/hooks/general";
import { Image } from "@chakra-ui/react";
import { IMediaMessage } from "core";

export const ProgressImage = ({
  message,
}: {
  message: Partial<IMediaMessage>;
}) => {
  const { thumbnail, url } = message;
  const [loading, setLoading] = useState<boolean>(true);
  const style = useMediaMsgStyle(message);
  return (
    <Image
      style={style}
      fallbackSrc={thumbnail!}
      className={clsx(
        "w-full",
        "h-full",
        "bg-cover",
        "transition-all",
        "duration-0",
        {
          "blur-sm": loading,
        }
      )}
      src={url}
      onLoad={() => {
        setLoading(false);
      }}
    />
  );
};
