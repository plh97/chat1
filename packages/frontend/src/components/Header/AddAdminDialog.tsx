import { FaPlus } from "react-icons/fa";
import { useEffect, useState } from "react";
import { Form } from "react-router-dom";
import {
  Button,
  Checkbox,
  CheckboxGroup,
  IconButton,
  SimpleGrid,
  Spinner,
  Text,
  useDisclosure,
  useToast,
  Field,
  Dialog,
  Portal,
} from "@/components/ui/chakra-compat";
import Api from "@/Api";
import { useAppSelector, useThunkDispatch } from "@/hooks/app";
import type { IUser } from "@/interfaces";
import { updateRoomThunk } from "@/store/reducer/room";
import { AppPagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 6;

export function AddAdmin() {
  const { open, onOpen, onClose } = useDisclosure();
  const roomInfo = useAppSelector((state) => state.room.data);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pageUsers, setPageUsers] = useState<IUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useThunkDispatch();
  const toast = useToast();

  useEffect(() => {
    if (!open || !roomInfo.id) return;

    let cancelled = false;
    setIsLoading(true);
    Api.getRoomUsers({
      id: roomInfo.id,
      role: "member",
      pageSize: PAGE_SIZE,
      start: (page - 1) * PAGE_SIZE,
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
  }, [open, page, roomInfo.id, toast]);

  const handleOpen = () => {
    setSelectedUserIds([]);
    setPage(1);
    onOpen();
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setPage(1);
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
      <IconButton size="lg" onClick={handleOpen} aria-label="add admin">
        <FaPlus className="text-2xl" />
      </IconButton>
      <Dialog.Root
        open={open}
        size="xl"
        onOpenChange={(e) => {
          if (!e.open) {
            handleClose();
          }
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>Set Admin</Dialog.Header>
              <Dialog.CloseTrigger />
              <Dialog.Body>
                <Form onSubmit={handleAddRoomAdmin}>
                  <Field.Root id="name">
                    <Field.Label>Name: </Field.Label>
                    {isLoading ? (
                      <Spinner />
                    ) : pageUsers.length ? (
                      <CheckboxGroup
                        colorPalette="green"
                        value={selectedUserIds}
                        onValueChange={(ids) =>
                          setSelectedUserIds(ids.map((id) => String(id)))
                        }
                      >
                        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                          {pageUsers.map((user) => (
                            <Checkbox.Root key={user.id} value={user.id}>
                              <Checkbox.HiddenInput />
                              <Checkbox.Control>
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                              <Checkbox.Label>{user.userName}</Checkbox.Label>
                            </Checkbox.Root>
                          ))}
                        </SimpleGrid>
                      </CheckboxGroup>
                    ) : (
                      <Text color="gray.500">No members available</Text>
                    )}
                  </Field.Root>
                </Form>
                <div className="mt-6 flex justify-center">
                  <AppPagination
                    count={totalCount}
                    page={page}
                    pageSize={PAGE_SIZE}
                    disabled={isLoading}
                    onPageChange={setPage}
                  />
                </div>
              </Dialog.Body>
              <Dialog.Footer>
                <Text mr="auto" color="gray.500">
                  {selectedUserIds.length} selected
                </Text>
                <Button mr={3} onClick={handleClose}>
                  Close
                </Button>
                <Button
                  type="button"
                  colorPalette="blue"
                  onClick={handleAddRoomAdmin}
                  loading={isSubmitting}
                >
                  Submit
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
