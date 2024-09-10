import React from "react";
import { IconButton, useDisclosure } from "@chakra-ui/react";
import { FaPlus } from "react-icons/fa";
import { Dispatch } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { USER } from "@/interfaces/IUser";
import { RootState } from "@/store/index";
import { Form } from "react-router-dom";
import { modifyRoomThunk } from "@/store/reducer/room";
import { Checkbox, CheckboxGroup } from "@chakra-ui/react";
import { Types } from "mongoose";
import { ROOM } from "@/interfaces/IRoom";

export function AddMember() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const myUserInfo = useSelector<RootState, Partial<USER>>((state) => {
    return state.user.data;
  });
  const roomInfo = useSelector<RootState, ROOM>((state) => {
    return state.room.data;
  });
  const [user, setUser] = useState<string[]>([]);
  const dispatch = useDispatch<Dispatch<any>>();
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
    await dispatch<any>(
      modifyRoomThunk({
        member: user,
        _id: new Types.ObjectId(roomInfo._id),
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
                  defaultValue={[...(roomInfo.member?.map((m) => m._id) ?? [])]}
                  onChange={(e) => {
                    setUser(e as string[]);
                    console.log("change", e);
                  }}
                >
                  <Stack spacing={[1, 5]} direction={["column", "row"]}>
                    {myUserInfo.friend?.map((user) => {
                      const isMember = !!roomInfo.member?.find(
                        (m) => user._id === m._id
                      );
                      return (
                        <Checkbox
                          disabled={isMember}
                          checked={isMember}
                          key={user._id}
                          value={user._id}
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
