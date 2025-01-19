import { Form } from "react-router-dom";
import {
  AvatarGroup,
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
import { AddMember } from "./AddMemberDialog";
import { AddAdmin } from "./AddAdminDialog";
import { FaCamera, FaFile, FaPause, FaPauseCircle } from "react-icons/fa";
import { setLocalUserInfo } from "@/store/reducer/user";
import useCamera from "@/hooks/useCamero";

export const AvatarEditButton = () => {
  const dispatch = useThunkDispatch();
  const fileRef = useRef<HTMLInputElement>(null);
  const room = useAppSelector((state) => state.room.data);
  const user = useAppSelector((state) => state.user.data);
  const { videoRef, startCamera, stopCamera, error, isStreaming } = useCamera();
  const onChange = async (files: File[]) => {
    const file = files?.[0];
    if (!file) return;
    const { url } = await Api.uploadFile(file);
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
    <>
      <video
        ref={videoRef}
        className="w-full h-full flex absolute top-0 rounded-full"
        style={{
          visibility: isStreaming ? "visible" : "hidden",
        }}
      />
      <span className="absolute bottom-[3px] left-[50%] transform translate-y-1/2 -translate-x-1/2 inline-flex">
        <IconButton
          isRound
          variant="solid"
          colorScheme="teal"
          aria-label="Change Avatar"
          fontSize="15px"
          width="6"
          height="6"
          minW="6"
          icon={<FaFile />}
          onClick={() => {
            fileRef.current?.click();
          }}
        />
        <input
          ref={fileRef}
          accept="image/*"
          className="hidden"
          type="file"
          onChange={() => {
            const files = fileRef.current?.files;
            if (files) {
              onChange(Array.from(files));
            }
          }}
        />
        {error && <p style={{ color: "red" }}>Error: {error}</p>}
        {!isStreaming ? (
          <IconButton
            isRound
            variant="solid"
            colorScheme="teal"
            aria-label="Change Avatar"
            fontSize="15px"
            width="6"
            height="6"
            minW="6"
            icon={<FaCamera />}
            onClick={startCamera}
          />
        ) : (
          <IconButton
            isRound
            variant="solid"
            colorScheme="teal"
            aria-label="Change Avatar"
            fontSize="15px"
            width="6"
            height="6"
            minW="6"
            icon={<FaPauseCircle />}
            onClick={stopCamera}
          />
        )}
      </span>
    </>
  );
};

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
  return (
    <Drawer key={2} isOpen={isOpen} placement="right" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Group Info</DrawerHeader>
        <DrawerBody>
          <Form className={clsx("flex flex-col gap-2")}>
            <FormControl className="relative flex justify-center mb-5">
              <Avatar size="lg" name={room.name} src={room.image ?? ""}>
                <AvatarEditButton />
              </Avatar>
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
  );
};
