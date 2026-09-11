import React, { useEffect, useRef, useState } from "react";
import { ShieldMinus, UserMinus, UserRoundCog } from "lucide-react";
import Api from "@/Api";
import { Avatar } from "@/components/Avatar";
import { WithProfile } from "@/components/WithProfile";
import { AppPagination } from "@/components/ui/Pagination";
import {
  Button,
  Dialog,
  Portal,
  Spinner,
  Text,
  useDisclosure,
  useToast,
} from "@/components/ui/chakra-compat";
import type { IUser } from "@/interfaces";
import type { RoomManagementAction } from "./roomManagement";

const PAGE_SIZE = 8;

interface RoomPeopleDialogProps {
  roomId: string;
  role: "member" | "admin";
  creatorId: string;
  currentUserId: string;
  initialTotalCount: number;
  canManage: boolean;
  canTransferOwnership: boolean;
  refreshVersion: number;
  onAction: (action: RoomManagementAction) => void;
}

export function RoomPeopleDialog({
  roomId,
  role,
  creatorId,
  currentUserId,
  initialTotalCount,
  canManage,
  canTransferOwnership,
  refreshVersion,
  onAction,
}: RoomPeopleDialogProps) {
  const { open, onOpen, onClose } = useDisclosure();
  const [users, setUsers] = useState<IUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const creatorConsumesFirstRow = useRef<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setTotalCount(initialTotalCount);
  }, [initialTotalCount]);

  useEffect(() => {
    setPage(1);
    creatorConsumesFirstRow.current = null;
  }, [creatorId, role, roomId]);

  useEffect(() => {
    if (!open || !roomId) return;

    let cancelled = false;
    setIsLoading(true);
    const firstPage = page === 1;
    const detectingCreatorRow =
      firstPage && creatorConsumesFirstRow.current === null;
    const creatorOffset = creatorConsumesFirstRow.current ?? true;
    Api.getRoomUsers({
      id: roomId,
      role,
      // The API prepends the creator to the first role page. Ask for one
      // extra row there so each visible page still contains PAGE_SIZE users.
      pageSize: detectingCreatorRow ? PAGE_SIZE + 1 : PAGE_SIZE,
      start: firstPage ? 0 : (page - 1) * PAGE_SIZE + (creatorOffset ? 1 : 0),
    })
      .then((response) => {
        if (cancelled) return;
        const responseUsers = response.users ?? [];
        const responseIncludesCreator = responseUsers.some(
          (person) => String(person.id) === String(creatorId)
        );
        const apiIncludesCreator = detectingCreatorRow
          ? responseIncludesCreator
          : creatorOffset;
        if (detectingCreatorRow) {
          creatorConsumesFirstRow.current = responseIncludesCreator;
        }
        const nextUsers = responseUsers
          .filter((person) => String(person.id) !== String(creatorId))
          .slice(0, PAGE_SIZE);
        const nextTotal = Math.max(
          nextUsers.length,
          (response.totalCount ?? 0) - (creatorId && apiIncludesCreator ? 1 : 0)
        );
        if (
          page > 1 &&
          !nextUsers.length &&
          nextTotal <= (page - 1) * PAGE_SIZE
        ) {
          setPage((current) => Math.max(1, current - 1));
          return;
        }
        setUsers(nextUsers);
        setTotalCount(nextTotal);
      })
      .catch(() => {
        if (cancelled) return;
        toast({
          title: `Unable to load ${role}s`,
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
  }, [creatorId, open, page, refreshVersion, role, roomId, toast]);

  const closeDialog = () => {
    setPage(1);
    onClose();
  };
  const requestAction = (action: RoomManagementAction) => {
    // Close the people list before opening the confirmation alert. Keeping
    // two modal focus traps open at once can make keyboard/mouse interaction
    // unreliable, especially while this dialog is already inside a drawer.
    closeDialog();
    onAction(action);
  };
  const title = role === "admin" ? "Manage admins" : "Manage members";

  return (
    <React.Fragment>
      <Button
        size="xs"
        variant="outline"
        className="h-8 min-h-8 rounded-md border-slate-600 bg-slate-800 px-3 text-slate-100 hover:bg-slate-700"
        aria-label={`${canManage || canTransferOwnership ? "Manage" : "View all"} ${role}s`}
        onClick={onOpen}
      >
        {canManage || canTransferOwnership ? "Manage" : "View all"}
      </Button>
      <Dialog.Root
        open={open}
        size="lg"
        onOpenChange={({ open: nextOpen }) => {
          if (!nextOpen) closeDialog();
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content className="flex h-[34rem] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden bg-slate-800 text-slate-50">
              <Dialog.Header className="shrink-0 border-b border-slate-700">
                {title}
              </Dialog.Header>
              <Dialog.CloseTrigger />
              <Dialog.Body className="min-h-0 flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Spinner />
                  </div>
                ) : users.length ? (
                  <div className="space-y-2">
                    {users.map((person) => (
                      <div
                        key={person.id}
                        className="flex min-h-14 items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2"
                      >
                        <WithProfile profile={person}>
                          <Avatar
                            src={person.image}
                            name={person.userName}
                            showBorder={false}
                          />
                        </WithProfile>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {person.userName}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          {canTransferOwnership &&
                          String(person.id) !== String(currentUserId) ? (
                            <Button
                              size="xs"
                              variant="outline"
                              aria-label={`Transfer ownership to ${person.userName}`}
                              onClick={() =>
                                requestAction({
                                  type: "transfer-owner",
                                  user: person,
                                })
                              }
                            >
                              <UserRoundCog />
                              Transfer
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button
                              size="xs"
                              colorPalette="red"
                              variant="outline"
                              aria-label={
                                role === "admin"
                                  ? `Revoke admin from ${person.userName}`
                                  : `Remove ${person.userName} from group`
                              }
                              onClick={() =>
                                requestAction({
                                  type:
                                    role === "admin"
                                      ? "remove-admin"
                                      : "remove-member",
                                  user: person,
                                })
                              }
                            >
                              {role === "admin" ? (
                                <ShieldMinus />
                              ) : (
                                <UserMinus />
                              )}
                              {role === "admin" ? "Revoke" : "Remove"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Text color="gray.400">
                      No {role === "admin" ? "admins" : "members"}
                    </Text>
                  </div>
                )}
              </Dialog.Body>
              <Dialog.Footer className="min-h-16 shrink-0 border-t border-slate-700">
                <div className="mr-auto">
                  <AppPagination
                    count={totalCount}
                    page={page}
                    pageSize={PAGE_SIZE}
                    disabled={isLoading}
                    onPageChange={setPage}
                  />
                </div>
                <Button onClick={closeDialog}>Close</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </React.Fragment>
  );
}
