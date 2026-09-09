import { FaPlus } from "react-icons/fa";
import { Form } from "react-router-dom";
import {
  Checkbox,
  CheckboxGroup,
  IconButton,
  useDisclosure,
} from "@/components/ui/chakra-compat";
import { updateRoomThunk } from "@/store/reducer/room";

export function AddMember() {
  const { open, onOpen, onClose } = useDisclosure();
  const roomInfo = useAppSelector((state) => state.room.data);
  const userInfo = useAppSelector((state) => state.user.data);
  const [user, setUser] = useState<string[]>([]);
  const dispatch = useThunkDispatch();
  const toast = useToast();
  const handleAddMember = async () => {
    if (!user.length) {
      toast({
        title: "Warning.",
        description: "Please select user",
        status: "error",
        position: "top",
        duration: 1000,
      });
      return;
    }
    const invitedList = user.filter(
      (u) => !roomInfo.member?.find((m) => m.id === u)
    );
    await dispatch(
      updateRoomThunk({
        id: roomInfo.id,
        memberId: invitedList,
      })
    );
    onClose();
    setUser([]);
    onClose();
  };
  const memberList = roomInfo.member
    .map((m) => m.id)
    .filter((m) => m !== userInfo.id);
  return (
    <>
      <IconButton aria-label="add member" size="lg" onClick={onOpen}>
        <FaPlus className="text-2xl" />
      </IconButton>
      <Modal isOpen={open} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Invite friend</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Form onSubmit={handleAddMember}>
              <FormControl id="name">
                <FormLabel>Name: </FormLabel>
                <CheckboxGroup
                  colorPalette="green"
                  defaultValue={memberList}
                  onValueChange={(id: string[]) => {
                    setUser(id);
                  }}
                >
                  <Stack gap={[1, 5]} direction={["column", "row"]}>
                    {userInfo.friend?.map((user) => {
                      const isMember = !!roomInfo.member?.find(
                        (m) => user.id === m.id
                      );
                      return (
                        <Checkbox.Root
                          disabled={isMember}
                          // checked={isMember}
                          key={user.id}
                          value={user.id}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Label>{user.userName}</Checkbox.Label>
                        </Checkbox.Root>
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
            <Button type="button" colorScheme="blue" onClick={handleAddMember}>
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
