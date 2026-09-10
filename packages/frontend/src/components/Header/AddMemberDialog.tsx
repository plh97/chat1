import { FaPlus } from "react-icons/fa";
import { Form } from "react-router-dom";
import {
  Checkbox,
  CheckboxGroup,
  IconButton,
  useDisclosure,
} from "@/components/ui/chakra-compat";
import { updateRoomThunk } from "@/store/reducer/room";

export function AddMember({ onUpdated }: { onUpdated?: () => void } = {}) {
  const { open, onOpen, onClose } = useDisclosure();
  const roomInfo = useAppSelector((state) => state.room.data);
  const userInfo = useAppSelector((state) => state.user.data);
  const [user, setUser] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useThunkDispatch();
  const toast = useToast();
  const handleOpen = () => {
    setUser([]);
    onOpen();
  };
  const handleClose = () => {
    setUser([]);
    onClose();
  };
  const handleAddMember = async () => {
    if (isSubmitting) return;
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
    if (!invitedList.length) {
      handleClose();
      return;
    }
    setIsSubmitting(true);
    try {
      await dispatch(
        updateRoomThunk({
          id: roomInfo.id,
          memberId: invitedList,
        })
      );
      onUpdated?.();
      toast({
        title: "Members updated",
        status: "success",
        position: "top",
        duration: 1500,
      });
      handleClose();
    } catch {
      toast({
        title: "Unable to update members",
        status: "error",
        position: "top",
        duration: 2000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      <IconButton aria-label="add member" size="sm" onClick={handleOpen}>
        <FaPlus className="text-base" />
      </IconButton>
      <Modal isOpen={open} onClose={handleClose}>
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
                  value={user}
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
            <Button mr={3} onClick={handleClose}>
              Close
            </Button>
            <Button
              type="button"
              colorScheme="blue"
              loading={isSubmitting}
              onClick={handleAddMember}
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
