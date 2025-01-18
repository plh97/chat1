import { Form } from "react-router-dom";
import { addRoomThunk } from "@/store/reducer/room";

export const AddRoomDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    return () => {
      setLoading(false);
    };
  });
  const dispatch = useThunkDispatch();
  const navigation = useNavigate();
  const toast = useToast();
  const handleAddRoom = async () => {
    if (!myUserInfo?.id) {
      return;
    }
    if (!roomName) {
      toast({
        title: "Warning.",
        description: "Please input room name",
        status: "error",
        position: "top",
        duration: 1000,
      });
      return;
    }
    setLoading(true);
    const resultAction = await dispatch(
      addRoomThunk({
        name: roomName, // Add a default name or get it from the body
        creatorId: myUserInfo?.id,
        memberId: [myUserInfo?.id],
        adminId: [myUserInfo?.id],
      })
    );
    setLoading(false);
    const payload = resultAction.payload as { id: string };
    if (!payload) return;
    onClose();
    setRoomName("");
    navigation(`/room/${payload?.id}`);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create Room</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Form onSubmit={handleAddRoom}>
            <FormControl id="name">
              <FormLabel>Name: </FormLabel>
              <Input
                type="text"
                autoComplete="off"
                autoFocus
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </FormControl>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            isLoading={loading}
            type="button"
            colorScheme="blue"
            onClick={handleAddRoom}
          >
            Add
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
