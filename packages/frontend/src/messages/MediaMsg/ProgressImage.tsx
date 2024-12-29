import { Image } from "@chakra-ui/react";
import { IMediaMessage } from "core";
import { CSSProperties } from "react";

export const ProgressImage = ({
  message,
}: {
  message: Partial<IMediaMessage>;
}) => {
  const { thumbnail, url } = message;
  const w = message.width!;
  const h = message.height!;
  const [loading, setLoading] = useState<boolean>(true);
  const patchStyle = useMemo(() => {
    const style: CSSProperties = {
      width: w,
      height: h,
      aspectRatio: `${w} / ${h}`,
    };
    if (w > h && w > 200) {
      Object.assign(style, {
        width: 200,
        height: "auto",
      });
    }
    if (h > w && h > 200) {
      Object.assign(style, {
        width: "auto",
        height: 200,
      });
    }
    return style;
  }, []);
  return (
    <Image
      style={{
        ...patchStyle,
      }}
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
