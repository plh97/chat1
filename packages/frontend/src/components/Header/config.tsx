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
import { AddAdmin } from "./AddAdminDialog";

export function Config() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef<HTMLButtonElement>(null);
  const room = useAppSelector((state) => state.room.data);
  const isGroup = room?.channelType === IChannelType.GROUP;
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
            <form>
              <FormControl>
                <FormLabel>Admin List</FormLabel>
                <div className="flex flex-row gap-2">
                  <AvatarGroup size="md" max={4}>
                    {room.admin.map((m) => (
                      <Avatar key={m.id} src={m.image} name={m.username} />
                    ))}
                  </AvatarGroup>
                  <AddAdmin />
                </div>
              </FormControl>
              <FormControl>
                <FormLabel>Member List</FormLabel>
                <div className="flex flex-row gap-2">
                  <AvatarGroup size="md" max={4}>
                    {room.member.map((m) => (
                      <Avatar key={m.id} src={m.image} name={m.username} />
                    ))}
                  </AvatarGroup>
                  <AddMember />
                </div>
              </FormControl>
            </form>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
