import { IconButton, Image } from "@/components/ui/chakra-compat";
import { FaDownload } from "react-icons/fa";
import { ProgressImage } from "./ProgressImage";
import { IMediaMessage } from "@/interfaces";
import { JSX } from "react";

const PreviewImage = ({
  mediaMessage,
  children,
  className,
}: Partial<IMediaMessage> & {
  mediaMessage: IMediaMessage;
  children: JSX.Element;
  className: string;
}) => {
  const { open, onOpen, onClose } = useDisclosure();
  const { url, thumbnail, file } = mediaMessage;
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

  const previewSrc = url || localPreview || thumbnail;

  return (
    <>
      <button onClick={onOpen} className={className}>
        {children}
      </button>
      <Modal isCentered onClose={onClose} size={"xl"} isOpen={open}>
        <ModalOverlay backdropFilter="auto" backdropBlur="2px" />
        <ModalContent className="flex items-center justify-center">
          <ModalCloseButton />
          {previewSrc ? (
            <Image
              src={previewSrc}
              fallbackSrc={thumbnail ?? localPreview ?? undefined}
              className="max-w-[70vw] max-h-[70vh]"
            />
          ) : null}
          {previewSrc ? (
            <a
              href={previewSrc}
              target="_blank"
              rel="noreferrer"
              download={mediaMessage.name || "image"}
            >
              <IconButton
                className="!absolute bottom-[-50px] right-[50%]"
                style={{ transform: "translateX(50%)" }}
                variant="solid"
                rounded="full"
                aria-label="Download Image"
              >
                <FaDownload className="text-xl" />
              </IconButton>
            </a>
          ) : null}
        </ModalContent>
      </Modal>
    </>
  );
};

export const ImageMsg = ({ message }: { message: IMediaMessage }) => {
  return (
    <PreviewImage
      className="overflow-hidden box-content p-2 max-w-[200px] max-h-[200px] cursor-pointer select-none"
      mediaMessage={message}
    >
      <ProgressImage message={message} />
    </PreviewImage>
  );
};
