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
import { IChannelType } from "db";
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
          key={1}
          ref={btnRef}
          onClick={onOpen}
          aria-label="config button"
          icon={<FiSettings className="text-2xl" />}
        />
      )}
      <Drawer
        key={2}
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
            <h3>Admin List</h3>
            <div className="flex flex-row gap-2">
              <AvatarGroup size="md" max={9}>
                {room.admin.map((m) => {
                  return <Avatar key={m.id} src={m.image} name={m.username} />;
                })}
              </AvatarGroup>
              <AddMember />
            </div>
            <h3>Member List</h3>
            <div className="flex flex-row gap-2">
              <AvatarGroup size="md" max={9}>
                {room.member.map((m) => {
                  return <Avatar key={m.id} src={m.image} name={m.username} />;
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
