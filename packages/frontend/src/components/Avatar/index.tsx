import * as AvatarComponent from "@radix-ui/react-avatar";
import { FaCamera, FaImage, FaPauseCircle } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { captureVideo } from "@/utils/capture";
import "./styles.css";

interface IProps extends React.PropsWithChildren {
  className?: string;
  name?: string;
  size?: "md" | "lg" | "xl";
  src?: string;
  count?: number;
  onChange?: (files: File[]) => Promise<void>;
  showBorder?: boolean;
  marginEnd?: string;
}

const generateColor = (name: string) => {
  const hash = name.charCodeAt(0) / 200;
  return "#" + Math.floor(hash * 0xffffff).toString(16);
};

function dataURLtoFile(base64: string, filename: string) {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[arr.length - 1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export const AvatarEditButton = ({ onChange }: any) => {
  const [captureLoading, setCaptureLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { videoRef, startCamera, stopCamera, isStreaming } = useCamera();
  const handleStopCamera = async () => {
    const { base64 } = captureVideo(videoRef.current!, "image/jpeg");
    const blob = dataURLtoFile(base64, "avatar.jpg");
    setCaptureLoading(true);
    await onChange([blob]);
    setTimeout(() => {
      stopCamera();
      setCaptureLoading(false);
    }, 1000);
  };
  return (
    <>
      {captureLoading && (
        <Loader2 className="flex absolute top-[calc(50%-16px)] left-[calc(50%-16px)] text-2xl w-8 h-8 text-gray-200 animate-spin dark:text-gray-600" />
      )}
      <video
        ref={videoRef}
        className="w-full h-full flex absolute top-0 rounded-full"
        style={{
          visibility: isStreaming ? "visible" : "hidden",
        }}
      />
      <span className="absolute bottom-[3px] left-[50%] transform translate-y-1/2 -translate-x-1/2 inline-flex">
        <IconButton
          isRound
          variant="solid"
          colorScheme="teal"
          aria-label="Change Avatar"
          fontSize="15px"
          width="6"
          height="6"
          minW="6"
          icon={<FaImage />}
          onClick={() => {
            fileRef.current?.click();
          }}
        />
        <input
          ref={fileRef}
          accept="image/*"
          className="hidden"
          type="file"
          onChange={() => {
            const files = fileRef.current?.files;
            if (files) {
              onChange(Array.from(files));
            }
          }}
        />
        {!isStreaming ? (
          <IconButton
            className="ml-1"
            isRound
            variant="solid"
            colorScheme="teal"
            aria-label="Change Avatar"
            fontSize="15px"
            width="6"
            height="6"
            minW="6"
            icon={<FaCamera />}
            onClick={startCamera}
          />
        ) : (
          <IconButton
            className="ml-1"
            isRound
            variant="solid"
            colorScheme="teal"
            aria-label="Change Avatar"
            fontSize="15px"
            width="6"
            height="6"
            minW="6"
            icon={<FaPauseCircle />}
            onClick={handleStopCamera}
          />
        )}
      </span>
    </>
  );
};

export const Avatar = ({
  name = "?",
  src,
  size = "md",
  count = 0,
  children,
  onChange,
  showBorder = true,
  marginEnd = "",
  ...args
}: IProps) => {
  const countMemo = useMemo(() => {
    if (count < 1 || isNaN(count)) {
      return null;
    }
    let c = count.toString();
    if (count > 99) {
      c = "99+";
    }
    return (
      <span className="absolute bg-rose-600 text-xs px-[0.33rem] text-white rounded-xl top-0 right-[-6px] text-center flex items-center justify-center">
        {c}
      </span>
    );
  }, [count]);
  return (
    <span className="relative">
      <AvatarComponent.Root
        {...args}
        style={{
          // backgroundColor: 'red',
          backgroundColor: generateColor(name),
          marginInlineEnd: marginEnd,
        }}
        className={clsx("AvatarRoot", size, {
          "border-2 border-black": showBorder,
        })}
      >
        <AvatarComponent.Image className="AvatarImage" src={src} alt="avatar" />
        <AvatarComponent.Fallback className="AvatarFallback">
          {name.slice(0, 2)}
        </AvatarComponent.Fallback>
      </AvatarComponent.Root>
      {countMemo}
      {onChange && <AvatarEditButton onChange={onChange} />}
      {children}
    </span>
  );
};
