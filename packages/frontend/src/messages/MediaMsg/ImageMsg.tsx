import { IconButton, Image } from "@chakra-ui/react";
import { IMediaMessage } from "core";
import { FaDownload } from "react-icons/fa";
import { ProgressImage } from "./ProgressImage";

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

const PreviewImage = ({
  mediaMessage,
  children,
}: Partial<IMediaMessage> & {
  mediaMessage: IMediaMessage;
  children: JSX.Element;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { url, thumbnail } = mediaMessage;
  // const { width, height } = useFixedSize(mediaMessage, 800, 600);
  return (
    <>
      <div onClick={onOpen}>{children}</div>
      <Modal isCentered onClose={onClose} size={"xl"} isOpen={isOpen}>
        <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="2px" />
        <ModalContent className="flex items-center justify-center !bg-black/0">
          <ModalCloseButton />
          <div className="max-w-[80vw] max-h-[80vh]">
            <Image
              src={url}
              fallbackSrc={thumbnail}
              className="bg-contain bg-no-repeat bg-center object-contain"
              style={{
                backgroundImage: `url(${thumbnail})`,
              }}
            />
          </div>
          <a href={url} target="_blank" rel="noreferrer" download="3223.png">
            <IconButton
              className="!absolute bottom-[-50px] right-[50%]"
              style={{ transform: "translateX(50%)" }}
              // bg="#000000"
              variant="solid"
              // width={100}
              rounded="full"
              aria-label="Download Image"
              icon={<FaDownload className="text-xl" />}
            />
          </a>
        </ModalContent>
      </Modal>
    </>
  );
};

export const ImageMsg = ({ message }: { message: IMediaMessage }) => {
  const thumbnail = message?.thumbnail;
  const { width, height } = useFixedSize(message);
  if (!thumbnail) return <div>Invalid Image</div>;
  return (
    <div
      className="overflow-hidden box-content p-2 max-w-[200px] max-h-[200px] cursor-pointer select-none"
      style={{ height, width }}
    >
      <PreviewImage mediaMessage={message}>
        <ProgressImage thumbnail={message.thumbnail} url={message.url} />
      </PreviewImage>
    </div>
  );
};
