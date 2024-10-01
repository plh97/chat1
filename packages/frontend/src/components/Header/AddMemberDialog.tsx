import { FaPlus } from "react-icons/fa";
import { Form } from "react-router-dom";
import {
  Checkbox,
  CheckboxGroup,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import { USER } from "@/interfaces/IUser";
import { modifyRoomThunk } from "@/store/reducer/room";
import { IRoom } from "@/interfaces/IMessage";

export function AddMember() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const roomInfo = useAppSelector<IRoom>((state) => state.room.data);
  const userInfo = useAppSelector<USER>((state) => state.user.data);
  const [user, setUser] = useState<string[]>([]);
  const dispatch = useThunkDispatch();
  const toast = useToast();
  const handleAddFriend = async () => {
    if (!user.length) {
      toast({
        title: "Warning.",
        description: "Please input room name",
        status: "error",
        position: "top",
        duration: 1000,
      });
      return;
    }
    await dispatch(
      modifyRoomThunk({
        member: user,
        id: roomInfo.id,
      })
    );
    onClose();
    setUser([]);
    onClose();
  };
  return (
    <>
      <IconButton
        aria-label="add member"
        size="lg"
        icon={<FaPlus className="text-2xl" />}
        onClick={onOpen}
      />
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Invite friend</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Form onSubmit={handleAddFriend}>
              <FormControl id="roomname">
                <FormLabel>Name: </FormLabel>
                <CheckboxGroup
                  colorScheme="green"
                  defaultValue={[...(roomInfo.member?.map((m) => m.id) ?? [])]}
                  onChange={(e) => {
                    setUser(e as string[]);
                    console.log("change", e);
                  }}
                >
                  <Stack spacing={[1, 5]} direction={["column", "row"]}>
                    {userInfo.friend?.map((user) => {
                      const isMember = !!roomInfo.member?.find(
                        (m) => user.id === m.id
                      );
                      return (
                        <Checkbox
                          disabled={isMember}
                          checked={isMember}
                          key={user.id}
                          value={user.id}
                        >
                          {user.username}
                        </Checkbox>
                      );
                    })}
                  </Stack>
                </CheckboxGroup>
              </FormControl>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Close
            </Button>
            <Button type="button" colorScheme="blue" onClick={handleAddFriend}>
              Invite friend
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
