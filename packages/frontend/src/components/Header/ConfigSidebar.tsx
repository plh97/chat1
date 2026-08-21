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
import Api from "@/Api";
import { updateRoomThunk } from "@/store/reducer/room";
import { appendRoomUsers } from "@/store/reducer/room";
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
  const [loadingMoreAdmins, setLoadingMoreAdmins] = useState(false);
  const [loadingMoreMembers, setLoadingMoreMembers] = useState(false);
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
  const hasMoreAdmins = loadedAdminCount < adminTotalCount;
  const loadedMemberCount = room.member?.length ?? 0;
  const memberTotalCount = room.memberTotalCount ?? loadedMemberCount;
  const hasMoreMembers = loadedMemberCount < memberTotalCount;
  const handleLoadMoreAdmins = async () => {
    if (!room.id || loadingMoreAdmins || !hasMoreAdmins) return;
    setLoadingMoreAdmins(true);
    try {
      const payload = await Api.queryUser({
        channelId: room.id,
        role: "admin",
        pageSize: 20,
        start: loadedAdminCount,
      });
      dispatch(
        appendRoomUsers({
          role: "admin",
          users: payload,
        })
      );
    } finally {
      setLoadingMoreAdmins(false);
    }
  };
  const handleLoadMoreMembers = async () => {
    if (!room.id || loadingMoreMembers || !hasMoreMembers) return;
    setLoadingMoreMembers(true);
    try {
      const payload = await Api.queryUser({
        channelId: room.id,
        role: "member",
        pageSize: 20,
        start: loadedMemberCount,
      });
      dispatch(
        appendRoomUsers({
          role: "member",
          users: payload,
        })
      );
    } finally {
      setLoadingMoreMembers(false);
    }
  };
  useEffect(() => {
    if (!isOpen || !room.id) return;
    if (!loadedAdminCount && adminTotalCount > 0 && !loadingMoreAdmins) {
      handleLoadMoreAdmins();
    }
    if (!loadedMemberCount && memberTotalCount > 0 && !loadingMoreMembers) {
      handleLoadMoreMembers();
    }
  }, [
    isOpen,
    room.id,
    loadedAdminCount,
    adminTotalCount,
    loadingMoreAdmins,
    loadedMemberCount,
    memberTotalCount,
    loadingMoreMembers,
  ]);
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
                {hasMoreAdmins ? (
                  <Button
                    size="sm"
                    onClick={handleLoadMoreAdmins}
                    isLoading={loadingMoreAdmins}
                  >
                    Load More
                  </Button>
                ) : null}
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
                {hasMoreMembers ? (
                  <Button
                    size="sm"
                    onClick={handleLoadMoreMembers}
                    isLoading={loadingMoreMembers}
                  >
                    Load More
                  </Button>
                ) : null}
              </div>
            </FormControl>
          </Form>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};
