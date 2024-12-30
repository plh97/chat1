import { Form } from "react-router-dom";
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
import Api from "@/Api";
import { FiSettings } from "react-icons/fi";
import { updateRoomThunk } from "@/store/reducer/room";
import { AddMember } from "./AddMemberDialog";
import { AddAdmin } from "./AddAdminDialog";
import { ChangeEvent } from "react";

export function Config() {
  const dispatch = useThunkDispatch();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef<HTMLButtonElement>(null);
  const room = useAppSelector((state) => state.room.data);
  const isGroup = room?.channelType === "GROUP";
  const handleChangeAvatar = async (files: File[]) => {
    const file = files?.[0];
    if (!file) return;
    const { url } = await Api.uploadFile(file);
    dispatch(
      updateRoomThunk({
        id: room.id,
        image: url,
      })
    );
  };
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch(
      updateRoomThunk({
        id: room.id,
        name: e.target.value,
      })
    );
  };
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
        // finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Group Info</DrawerHeader>
          <DrawerBody>
            <Form className={clsx("flex flex-col gap-2")}>
              <FormControl className="relative flex justify-center mb-5">
                <Avatar
                  size="lg"
                  name={room.name}
                  src={room.image ?? ""}
                  onChange={handleChangeAvatar}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Group Name</FormLabel>
                <Input
                  defaultValue={room.name}
                  name="name"
                  placeholder="Group Name"
                  onBlur={handleNameChange}
                />
              </FormControl>
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
            </Form>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
