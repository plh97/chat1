import { Form } from "react-router-dom";
import { addRoomThunk } from "@/store/reducer/room";

export const AddRoomDialog = () => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const [roomName, setRoomName] = useState("");
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
    const { payload } = await dispatch(
      addRoomThunk({
        name: roomName, // Add a default name or get it from the body
        createrId: myUserInfo?.id,
        memberId: [myUserInfo?.id],
        adminId: [myUserInfo?.id],
      })
    );
    onClose();
    setRoomName("");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    navigation(`/room/${payload?.id}`);
  };
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Button colorScheme="grey" variant="outline" onClick={onOpen}>
        ADD ROOM
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Room</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Form onSubmit={handleAddRoom}>
              <FormControl id="roomname">
                <FormLabel>Name: </FormLabel>
                <Input
                  type="text"
                  autoComplete="true"
                  autoFocus
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </FormControl>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              CANCEL
            </Button>
            <Button type="button" colorScheme="blue" onClick={handleAddRoom}>
              ADD
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
