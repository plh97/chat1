import { Form } from "react-router-dom";
import {
  AvatarGroup,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { updateRoomThunk } from "@/store/reducer/room";
import { AddMember } from "./AddMemberDialog";
import { AddAdmin } from "./AddAdminDialog";
import { setLocalUserInfo } from "@/store/reducer/user";
import { uploadFileWithPresignedUrl } from "@/utils/uploadFile";

export const ConfigSidebar = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const dispatch = useThunkDispatch();
  const room = useAppSelector((state) => state.room.data);
  const [localName, setLocalName] = useState(room.name);
  useEffect(() => {
    setLocalName(room.name);
  }, [setLocalName, room.name]);
  const handleNameChange = () => {
    dispatch(
      updateRoomThunk({
        id: room.id,
        name: localName,
      })
    );
  };
  const user = useAppSelector((state) => state.user.data);
  const onAvatarChange = async (files: File[]) => {
    const file = files?.[0];
    if (!file) return;
    const url = await uploadFileWithPresignedUrl(file, 1);
    dispatch(
      updateRoomThunk({
        id: room.id,
        image: url,
      })
    );
    const updatedRoom = (user.room ?? []).map((r) => {
      if (r.id === room.id) {
        return {
          ...r,
          image: url,
        };
      }
      return r;
    });
    dispatch(
      setLocalUserInfo({
        room: updatedRoom,
      })
    );
  };
  const loadedAdminCount = room.admin?.length ?? 0;
  const adminTotalCount = room.adminTotalCount ?? loadedAdminCount;
  const loadedMemberCount = room.member?.length ?? 0;
  const memberTotalCount = room.memberTotalCount ?? loadedMemberCount;
  return (
    <Drawer key={2} isOpen={isOpen} placement="right" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Group Info</DrawerHeader>
        <DrawerBody>
          <Form className={clsx("flex flex-col gap-2")}>
            <FormControl className="relative flex justify-center mb-5">
              <Avatar
                onChange={onAvatarChange}
                size="lg"
                name={room.name}
                src={room.image ?? ""}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Group Name</FormLabel>
              <InputGroup size="md">
                <Input
                  pr="4.5rem"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  name="name"
                  placeholder="Group Name"
                />
                <InputRightElement width="4.5rem">
                  <Button
                    isDisabled={room.name === localName}
                    h="1.75rem"
                    size="sm"
                    onClick={() => handleNameChange()}
                  >
                    Save
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <FormControl>
              <FormLabel>Admin List</FormLabel>
              <div className="flex flex-row gap-2 items-center flex-wrap">
                <AvatarGroup size="md" max={adminTotalCount}>
                  {room.admin.map((m) => (
                    <Avatar key={m.id} src={m.image} name={m.userName} />
                  ))}
                </AvatarGroup>
                <AddAdmin />
              </div>
            </FormControl>
            <FormControl>
              <FormLabel>Member List</FormLabel>
              <div className="flex flex-row gap-2 items-center flex-wrap">
                <AvatarGroup size="md" max={memberTotalCount}>
                  {room.member.map((m) => (
                    <Avatar key={m.id} src={m.image} name={m.userName} />
                  ))}
                </AvatarGroup>
                <AddMember />
              </div>
            </FormControl>
          </Form>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};
