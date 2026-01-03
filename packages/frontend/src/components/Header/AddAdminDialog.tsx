import { FaPlus } from "react-icons/fa";
import { Form } from "react-router-dom";
import { Checkbox, CheckboxGroup, useDisclosure } from "@chakra-ui/react";
import { updateRoomThunk } from "@/store/reducer/room";

export function AddAdmin() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const roomInfo = useAppSelector((state) => state.room.data);
  const [user, setUser] = useState<string[]>([]);
  const dispatch = useThunkDispatch();
  const toast = useToast();
  const handleAddRoomAdmin = async () => {
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
      (u) => !roomInfo.admin?.find((m) => m.id === u)
    );
    await dispatch(
      updateRoomThunk({
        id: roomInfo.id,
        adminId: invitedList,
      })
    );
    onClose();
    setUser([]);
    onClose();
  };
  const users = roomInfo.admin.map((m) => m.id);
  return (
    <>
      <IconButton
        size="lg"
        onClick={onOpen}
        aria-label="add admin"
        icon={<FaPlus className="text-2xl" />}
      />
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Set Admin</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Form onSubmit={handleAddRoomAdmin}>
              <FormControl id="name">
                <FormLabel>Name: </FormLabel>
                <CheckboxGroup
                  colorScheme="green"
                  defaultValue={users}
                  onChange={(id: string[]) => {
                    setUser(id);
                  }}
                >
                  <Stack spacing={[1, 5]} direction={["column", "row"]}>
                    {roomInfo.member?.map((user) => {
                      const isInvited = !!roomInfo.admin?.find(
                        (m) => user.id === m.id
                      );
                      return (
                        <Checkbox
                          disabled={isInvited}
                          // checked={isInvited}
                          key={user.id}
                          value={user.id}
                        >
                          {user.userName}
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
            <Button
              type="button"
              colorScheme="blue"
              onClick={handleAddRoomAdmin}
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
