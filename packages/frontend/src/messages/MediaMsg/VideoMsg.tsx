import {
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
} from "@chakra-ui/react";
import { FaPlay } from "react-icons/fa";
import { useFixedSize } from "@/hooks/general";
import { IMediaMessage } from "@/interfaces";
import { ProgressImage } from "./ProgressImage";

const createVideoThumbnail = (src: string) => {
  return new Promise<string>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = src;

    const cleanup = () => {
      video.pause();
      video.remove();
    };

    video.onloadeddata = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Failed to create canvas context"));
          return;
        }
        canvas.width = video.videoWidth || 200;
        canvas.height = video.videoHeight || 200;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL("image/jpeg", 0.8);
        canvas.remove();
        cleanup();
        resolve(thumbnail);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video preview"));
    };
  });
};

export const VideoMsg = ({ message }: { message: IMediaMessage }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [localPreview, setLocalPreview] = useState("");
  const [localThumbnail, setLocalThumbnail] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const { width, height } = useFixedSize(message);
  const thumbnail = message.thumbnail || localThumbnail;
  const videoSrc = message.url || localPreview;
  const containerStyle = width && height ? { height, width } : undefined;

  useEffect(() => {
    if (!message.file) {
      setLocalPreview("");
      setLocalThumbnail("");
      return;
    }
    const objectUrl = URL.createObjectURL(message.file);
    setLocalPreview(objectUrl);
    createVideoThumbnail(objectUrl)
      .then(setLocalThumbnail)
      .catch(() => {
        setLocalThumbnail("");
      });

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [message.file]);

  useEffect(() => {
    if (!isOpen) return;
    videoRef.current?.play().catch(() => {
      // ignore autoplay interruption errors
    });
  }, [isOpen, videoSrc]);

  return (
    <>
      <button
        className="box-content p-2.5 relative overflow-hidden max-w-[200px] max-h-[200px] cursor-pointer select-none flex items-center justify-center"
        style={containerStyle}
        onClick={() => {
          if (!videoSrc) return;
          onOpen();
        }}
      >
        <IconButton
          className="!absolute z-10"
          as={"span"}
          aria-label="play button"
          icon={<FaPlay />}
        />
        <ProgressImage
          message={{
            ...message,
            thumbnail,
            file: undefined,
            url: thumbnail || message.url,
          }}
        />
      </button>
      <Modal isCentered onClose={onClose} size="6xl" isOpen={isOpen}>
        <ModalOverlay backdropFilter="auto" backdropBlur="4px" />
        <ModalContent className="bg-black">
          <ModalCloseButton zIndex={2} />
          <ModalBody className="flex items-center justify-center p-0">
            {videoSrc ? (
              <video
                ref={videoRef}
                className="max-h-[85vh] w-full bg-black"
                src={videoSrc}
                poster={thumbnail || undefined}
                playsInline
                preload="metadata"
                autoPlay
                controls
              >
                <track kind="captions" />
              </video>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
