import { IconButton } from "@chakra-ui/react";
import { FiSettings } from "react-icons/fi";
import { ConfigSidebar } from "./ConfigSidebar";

export function Config() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const room = useAppSelector((state) => state.room.data);
  const isGroup = room?.channelType === "GROUP";
  return (
    <>
      {isGroup && (
        <IconButton
          key={1}
          onClick={onOpen}
          aria-label="config button"
          icon={<FiSettings className="text-2xl" />}
        />
      )}
      <ConfigSidebar isOpen={isOpen} onClose={onClose} />
    </>
  );
}
