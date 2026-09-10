import { Form } from "react-router-dom";
import { Button, Drawer, Portal } from "@/components/ui/chakra-compat";
import { updateRoomThunk } from "@/store/reducer/room";
import { AddMember } from "./AddMemberDialog";
import { AddAdmin } from "./AddAdminDialog";
import { setLocalUserInfo } from "@/store/reducer/user";
import { uploadFileWithPresignedUrl } from "@/utils/uploadFile";
import { WithProfile } from "@/components/WithProfile";

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
  return (
    <Drawer.Root
      key={2}
      open={isOpen}
      placement="end"
      onOpenChange={(e) => {
        if (!e.open) {
          onClose();
        }
      }}
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.CloseTrigger />
            <Drawer.Header>Group Info</Drawer.Header>
            <Drawer.Body>
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
                  <div className="relative">
                    <Input
                      pe="5rem"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      name="name"
                      placeholder="Group Name"
                    />
                    <Button
                      className="!absolute right-1 top-1/2 -translate-y-1/2"
                      disabled={room.name === localName}
                      h="1.75rem"
                      size="sm"
                      onClick={() => handleNameChange()}
                    >
                      Save
                    </Button>
                  </div>
                </FormControl>
                <FormControl>
                  <FormLabel>Admin List</FormLabel>
                  <div className="flex flex-row gap-2 items-center flex-wrap">
                    <div className="flex flex-wrap gap-2">
                      {room.admin.map((m) => (
                        <WithProfile key={m.id} profile={m}>
                          <Avatar src={m.image} name={m.userName} />
                        </WithProfile>
                      ))}
                    </div>
                    <AddAdmin />
                  </div>
                </FormControl>
                <FormControl>
                  <FormLabel>Member List</FormLabel>
                  <div className="flex flex-row gap-2 items-center flex-wrap">
                    <div className="flex flex-wrap gap-2">
                      {room.member.map((m) => (
                        <WithProfile key={m.id} profile={m}>
                          <Avatar src={m.image} name={m.userName} />
                        </WithProfile>
                      ))}
                    </div>
                    <AddMember />
                  </div>
                </FormControl>
              </Form>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
};
