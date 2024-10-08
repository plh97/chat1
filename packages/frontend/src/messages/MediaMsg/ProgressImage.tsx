import { Image } from "@chakra-ui/react";
import { IMediaMessage } from "core";
import classNames from "classnames";

export const ProgressImage = ({ thumbnail, url }: Partial<IMediaMessage>) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [[w, h], setSize] = useState([0, 0]);
  if (!loading) {
    return (
      <Image
        fallbackSrc={thumbnail}
        className={classNames(
          "w-full",
          "h-full",
          "bg-cover",
          "transition-all",
          "duration-50",
          {
            "blur-sm": loading,
          }
        )}
        style={{
          width: w,
          height: h,
        }}
        src={url}
        onLoad={() => {
          setLoading(false);
        }}
        onError={() => {
          setLoading(false);
        }}
      />
    );
  }
  return (
    <Image
      fallbackSrc={thumbnail}
      className={classNames(
        "w-full",
        "h-full",
        "bg-cover",
        "transition-all",
        "duration-50",
        {
          "blur-sm": loading,
        }
      )}
      src={thumbnail}
      onLoad={(e) => {
        setLoading(false);
        setSize([e.currentTarget.width, e.currentTarget.height]);
      }}
    />
  );
};
