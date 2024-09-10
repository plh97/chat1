import { Dispatch } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { USER } from "@/interfaces/IUser";
import { RootState } from "@/store/index";
import { Form } from "react-router-dom";
import { addRoomThunk } from "@/store/reducer/room";

export const AddRoomDialog = () => {
  const myUserInfo = useSelector<RootState, Partial<USER>>((state) => {
    return state.user.data;
  });
  const [roomName, setRoomName] = useState("");
  const dispatch = useDispatch<Dispatch<any>>();
  const navigation = useNavigate();
  const toast = useToast();
  async function handleAddRoom() {
    if (!myUserInfo._id) {
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
    const { payload } = await dispatch<any>(
      addRoomThunk({
        name: roomName,
        member: [],
      })
    );
    onClose();
    setRoomName("");
    navigation(`/room/${payload._id}`);
  }
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Button colorScheme="grey" variant="outline" onClick={onOpen}>
        Add Room
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
              Cancel
            </Button>
            <Button type="button" colorScheme="blue" onClick={handleAddRoom}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
