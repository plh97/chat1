import {
  AvatarGroup,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  IconButton,
} from "@chakra-ui/react";
import { IChannelType } from "@chatroom/core";
import { AddMember } from "./AddMemberDialog";
import { FiSettings } from "react-icons/fi";

export function Config() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef<HTMLButtonElement>(null);
  const room = useAppSelector((state) => state.room.data);
  const isGroup = room?.channelType === IChannelType.GROUP;
  const members = room?.member;
  return (
    <>
      {isGroup && (
        <IconButton
          ref={btnRef}
          onClick={onOpen}
          aria-label="config button"
          icon={<FiSettings className="text-2xl" />}
        />
      )}
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Group Info</DrawerHeader>
          <DrawerBody>
            <div className="flex flex-row gap-2">
              <AvatarGroup size="md" max={9}>
                {members?.map((m) => {
                  return <Avatar key={m._id} src={m.image} name={m.username} />;
                })}
              </AvatarGroup>
              <AddMember />
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
