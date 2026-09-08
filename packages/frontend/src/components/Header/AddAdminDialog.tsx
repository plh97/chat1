import { FaPlus } from "react-icons/fa";
import { useEffect, useState } from "react";
import { Form } from "react-router-dom";
import {
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import Api from "@/Api";
import { useAppSelector, useThunkDispatch } from "@/hooks/app";
import type { IUser } from "@/interfaces";
import { updateRoomThunk } from "@/store/reducer/room";

const PAGE_SIZE = 12;

export function AddAdmin() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const roomInfo = useAppSelector((state) => state.room.data);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pageUsers, setPageUsers] = useState<IUser[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useThunkDispatch();
  const toast = useToast();

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (!isOpen || !roomInfo.id) return;

    let cancelled = false;
    setIsLoading(true);
    Api.getRoomUsers({
      id: roomInfo.id,
      role: "member",
      pageSize: PAGE_SIZE,
      start: page * PAGE_SIZE,
    })
      .then((response) => {
        if (cancelled) return;
        setPageUsers(response.users ?? []);
        setTotalCount(response.totalCount ?? 0);
      })
      .catch(() => {
        if (cancelled) return;
        toast({
          title: "Unable to load members",
          status: "error",
          position: "top",
          duration: 2000,
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, page, roomInfo.id, toast]);

  const handleOpen = () => {
    setSelectedUserIds([]);
    setPage(0);
    onOpen();
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setPage(0);
    onClose();
  };

  const handleAddRoomAdmin = async () => {
    if (!selectedUserIds.length) {
      toast({
        title: "Warning.",
        description: "Please select user",
        status: "error",
        position: "top",
        duration: 1000,
      });
      return;
    }
    const invitedList = selectedUserIds.filter(
      (u) => !roomInfo.admin?.find((m) => m.id === u)
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
          adminId: invitedList,
        })
      );
      toast({
        title: "Admin updated",
        status: "success",
        position: "top",
        duration: 1500,
      });
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <IconButton
        size="lg"
        onClick={handleOpen}
        aria-label="add admin"
        icon={<FaPlus className="text-2xl" />}
      />
      <Modal isOpen={isOpen} onClose={handleClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Set Admin</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Form onSubmit={handleAddRoomAdmin}>
              <FormControl id="name">
                <FormLabel>Name: </FormLabel>
                {isLoading ? (
                  <Spinner />
                ) : pageUsers.length ? (
                  <CheckboxGroup
                    colorScheme="green"
                    value={selectedUserIds}
                    onChange={(ids) =>
                      setSelectedUserIds(ids.map((id) => String(id)))
                    }
                  >
                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                      {pageUsers.map((user) => (
                        <Checkbox key={user.id} value={user.id}>
                          {user.userName}
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </CheckboxGroup>
                ) : (
                  <Text color="gray.500">No members available</Text>
                )}
              </FormControl>
            </Form>
            <ButtonGroup mt={6} width="100%" justifyContent="space-between">
              <Button
                onClick={() => setPage((current) => current - 1)}
                isDisabled={page === 0 || isLoading}
              >
                Previous
              </Button>
              <HStack>
                <Text>Page</Text>
                <Select
                  aria-label="Page"
                  size="sm"
                  width="auto"
                  value={page}
                  onChange={(event) => setPage(Number(event.target.value))}
                  isDisabled={isLoading}
                >
                  {Array.from({ length: pageCount }, (_, index) => (
                    <option key={index} value={index}>
                      {index + 1}
                    </option>
                  ))}
                </Select>
                <Text>of {pageCount}</Text>
              </HStack>
              <Button
                onClick={() => setPage((current) => current + 1)}
                isDisabled={page + 1 >= pageCount || isLoading}
              >
                Next
              </Button>
            </ButtonGroup>
          </ModalBody>
          <ModalFooter>
            <Text mr="auto" color="gray.500">
              {selectedUserIds.length} selected
            </Text>
            <Button mr={3} onClick={handleClose}>
              Close
            </Button>
            <Button
              type="button"
              colorScheme="blue"
              onClick={handleAddRoomAdmin}
              isLoading={isSubmitting}
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
