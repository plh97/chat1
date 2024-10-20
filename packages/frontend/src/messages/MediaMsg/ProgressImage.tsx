import { Image } from "@chakra-ui/react";
import { IMediaMessage } from "core";
import classNames from "classnames";

export const ProgressImage = ({ thumbnail, url }: Partial<IMediaMessage>) => {
  const [loading, setLoading] = useState<boolean>(true);
  // if (!loading) {
  //   return (
  //     <Image
  //       fallbackSrc={thumbnail!}
  //       className={classNames(
  //         "w-full",
  //         "h-full",
  //         "bg-cover",
  //         "transition-all",
  //         "duration-50",
  //         {
  //           "blur-sm": loading,
  //         }
  //       )}
  //       src={url}
  //       onLoad={() => {
  //         setLoading(false);
  //       }}
  //       onError={() => {
  //         setLoading(false);
  //       }}
  //     />
  //   );
  // }
  return (
    <Image
      fallbackSrc={thumbnail!}
      className={classNames(
        "w-full",
        "h-full",
        "bg-cover",
        "transition-all",
        "duration-0",
        {
          "blur-sm": loading,
        }
      )}
      src={url!}
      onLoad={() => {
        setLoading(false);
      }}
    />
  );
};
