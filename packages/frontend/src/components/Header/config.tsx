import { IconButton } from "@/components/ui/chakra-compat";
import { FiSettings } from "react-icons/fi";
import { ConfigSidebar } from "./ConfigSidebar";

export function Config() {
  const { open, onOpen, onClose } = useDisclosure();
  const room = useAppSelector((state) => state.room.data);
  const isConfigurableRoom = room?.channelType !== "PRIVATE";
  if (!isConfigurableRoom) {
    return;
  }
  return (
    <>
      <IconButton key={1} onClick={onOpen} aria-label="config button">
        <FiSettings className="text-2xl" />
      </IconButton>
      <ConfigSidebar isOpen={open} onClose={onClose} />
    </>
  );
}
