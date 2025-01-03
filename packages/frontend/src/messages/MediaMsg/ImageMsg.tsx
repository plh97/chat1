import { IconButton, Image } from "@chakra-ui/react";
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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { url, thumbnail } = mediaMessage;
  return (
    <>
      <button onClick={onOpen} className={className}>
        {children}
      </button>
      <Modal isCentered onClose={onClose} size={"xl"} isOpen={isOpen}>
        <ModalOverlay backdropFilter="auto" backdropBlur="2px" />
        <ModalContent className="flex items-center justify-center">
          <ModalCloseButton />
          <Image
            src={url}
            fallbackSrc={thumbnail ?? ""}
            className="max-w-[70vw] max-h-[70vh]"
          />
          <a href={url} target="_blank" rel="noreferrer" download="3223.png">
            <IconButton
              className="!absolute bottom-[-50px] right-[50%]"
              style={{ transform: "translateX(50%)" }}
              variant="solid"
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
  if (!thumbnail) return <div>Invalid Image</div>;
  return (
    <PreviewImage
      className="overflow-hidden box-content p-2 max-w-[200px] max-h-[200px] cursor-pointer select-none"
      mediaMessage={message}
    >
      <ProgressImage message={message} />
    </PreviewImage>
  );
};
