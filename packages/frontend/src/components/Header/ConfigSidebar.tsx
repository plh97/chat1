import React, { useEffect, useMemo, useState } from "react";
import { Crown, ShieldCheck, Users } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { WithProfile } from "@/components/WithProfile";
import {
  Button,
  Dialog,
  Drawer,
  FormControl,
  FormLabel,
  Input,
  Portal,
  Spinner,
  Text,
  useToast,
} from "@/components/ui/chakra-compat";
import { useAppSelector, useThunkDispatch } from "@/hooks/app";
import type { IUser } from "@/interfaces";
import { updateRoomThunk } from "@/store/reducer/room";
import { uploadFileWithPresignedUrl } from "@/utils/uploadFile";
import { AddMember } from "./AddMemberDialog";
import { AddAdmin } from "./AddAdminDialog";
import { RoomPeopleDialog } from "./RoomPeopleDialog";
import {
  buildRoomManagementUpdate,
  getRoomManagementPermissions,
  type RoomManagementAction,
} from "./roomManagement";

const sameId = (left: unknown, right: unknown) =>
  String(left ?? "") === String(right ?? "");

const uniquePeople = (people: IUser[], creatorId: string) => {
  const result = new Map<string, IUser>();
  for (const person of people ?? []) {
    const id = String(person.id ?? "");
    if (id && !sameId(id, creatorId)) result.set(id, person);
  }
  return Array.from(result.values());
};

const roleCountWithoutCreator = (
  totalCount: number | undefined,
  visiblePeople: IUser[],
  creatorId: string
) => {
  const visibleCount = uniquePeople(visiblePeople, creatorId).length;
  const total = totalCount ?? visiblePeople.length;
  const includesCreator = visiblePeople.some((person) =>
    sameId(person.id, creatorId)
  );
  return Math.max(visibleCount, total - (includesCreator ? 1 : 0));
};

function PeoplePreview({ people }: { people: IUser[] }) {
  if (!people.length) {
    return <Text color="gray.400">None</Text>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {people.map((person) => (
        <WithProfile key={person.id} profile={person}>
          <Avatar
            src={person.image}
            name={person.userName}
            showBorder={false}
          />
        </WithProfile>
      ))}
    </div>
  );
}

const actionCopy = (action: RoomManagementAction) => {
  switch (action.type) {
    case "remove-member":
      return {
        title: "Remove member?",
        description: `${action.user.userName} will be removed from this group and will no longer receive room messages.`,
        confirm: "Remove from group",
        success: "Member removed",
      };
    case "remove-admin":
      return {
        title: "Revoke admin privileges?",
        description: `${action.user.userName} will remain in the group as an ordinary member.`,
        confirm: "Revoke admin",
        success: "Admin privileges revoked",
      };
    case "transfer-owner":
      return {
        title: "Transfer ownership?",
        description: `${action.user.userName} will become the owner. Only the new owner can manage admins or transfer ownership again.`,
        confirm: "Transfer ownership",
        success: "Ownership transferred",
      };
  }
};

export const ConfigSidebar = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const dispatch = useThunkDispatch();
  const room = useAppSelector((state) => state.room.data);
  const currentUser = useAppSelector((state) => state.user.data);
  const toast = useToast();
  const [localName, setLocalName] = useState(room.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<RoomManagementAction | null>(null);
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const [peopleRefreshVersion, setPeopleRefreshVersion] = useState(0);

  const creatorId = String(room.creator?.id ?? room.creatorId ?? "");
  const permissions = useMemo(
    () => getRoomManagementPermissions(room, currentUser.id),
    [currentUser.id, room]
  );
  const admins = useMemo(
    () => uniquePeople(room.admin ?? [], creatorId),
    [creatorId, room.admin]
  );
  const members = useMemo(
    () => uniquePeople(room.member ?? [], creatorId),
    [creatorId, room.member]
  );
  const adminTotalCount = roleCountWithoutCreator(
    room.adminTotalCount,
    room.admin ?? [],
    creatorId
  );
  const memberTotalCount = roleCountWithoutCreator(
    room.memberTotalCount,
    room.member ?? [],
    creatorId
  );

  useEffect(() => {
    setLocalName(room.name);
  }, [room.name]);

  useEffect(() => {
    if (!isOpen) setPendingAction(null);
  }, [isOpen]);

  const handleNameChange = async () => {
    const name = localName.trim();
    if (!permissions.canEditRoom || !name || name === room.name || isSavingName)
      return;
    setIsSavingName(true);
    try {
      await dispatch(updateRoomThunk({ id: room.id, name }));
      setLocalName(name);
      toast({
        title: "Group name updated",
        status: "success",
        position: "top",
        duration: 1500,
      });
    } catch {
      toast({
        title: "Unable to update group name",
        status: "error",
        position: "top",
        duration: 2000,
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const onAvatarChange = async (files: File[]) => {
    const file = files?.[0];
    if (!file || !permissions.canEditRoom || isSavingAvatar) return;
    setIsSavingAvatar(true);
    try {
      const url = await uploadFileWithPresignedUrl(file, 1);
      await dispatch(updateRoomThunk({ id: room.id, image: url }));
      toast({
        title: "Group avatar updated",
        status: "success",
        position: "top",
        duration: 1500,
      });
    } catch {
      toast({
        title: "Unable to update group avatar",
        status: "error",
        position: "top",
        duration: 2000,
      });
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleConfirmedAction = async () => {
    if (!pendingAction || isApplyingAction) return;
    const copy = actionCopy(pendingAction);
    setIsApplyingAction(true);
    try {
      await dispatch(
        updateRoomThunk(buildRoomManagementUpdate(room.id, pendingAction))
      );
      setPeopleRefreshVersion((value) => value + 1);
      setPendingAction(null);
      toast({
        title: copy.success,
        status: "success",
        position: "top",
        duration: 1800,
      });
    } catch {
      toast({
        title: "Unable to update room roles",
        status: "error",
        position: "top",
        duration: 2000,
      });
    } finally {
      setIsApplyingAction(false);
    }
  };

  const pendingCopy = pendingAction ? actionCopy(pendingAction) : null;
  const trimmedName = localName.trim();

  return (
    <React.Fragment>
      <Drawer.Root
        open={isOpen}
        placement="end"
        onOpenChange={({ open }) => {
          if (!open) onClose();
        }}
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content className="bg-slate-800 text-slate-50">
              <Drawer.CloseTrigger />
              <Drawer.Header className="border-b border-slate-700">
                Group Info
              </Drawer.Header>
              <Drawer.Body className="space-y-6 overflow-y-auto py-5">
                <FormControl className="relative flex justify-center pb-1">
                  <Avatar
                    onChange={
                      permissions.canEditRoom ? onAvatarChange : undefined
                    }
                    size="lg"
                    name={room.name}
                    src={room.image ?? ""}
                  />
                  {isSavingAvatar ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/60">
                      <Spinner size="sm" />
                    </div>
                  ) : null}
                </FormControl>

                <FormControl>
                  <FormLabel>Group Name</FormLabel>
                  <div className="relative">
                    <Input
                      pe={permissions.canEditRoom ? "5rem" : undefined}
                      value={localName}
                      disabled={!permissions.canEditRoom || isSavingName}
                      onChange={(event) => setLocalName(event.target.value)}
                      name="name"
                      placeholder="Group Name"
                    />
                    {permissions.canEditRoom ? (
                      <Button
                        type="button"
                        className="!absolute right-1 top-1/2 -translate-y-1/2"
                        disabled={
                          !trimmedName ||
                          trimmedName === room.name ||
                          isSavingName
                        }
                        loading={isSavingName}
                        h="1.75rem"
                        size="sm"
                        onClick={handleNameChange}
                      >
                        Save
                      </Button>
                    ) : null}
                  </div>
                </FormControl>

                <FormControl>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <FormLabel className="!mb-0 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-400" /> Owner
                    </FormLabel>
                  </div>
                  {room.creator ? (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <WithProfile profile={room.creator}>
                        <Avatar
                          src={room.creator.image}
                          name={room.creator.userName}
                          showBorder={false}
                        />
                      </WithProfile>
                      <span className="min-w-0 truncate text-sm font-medium">
                        {room.creator.userName}
                      </span>
                    </div>
                  ) : (
                    <Text color="gray.400">Unknown</Text>
                  )}
                </FormControl>

                <FormControl>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <FormLabel className="!mb-0 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-sky-400" /> Admins
                      <span className="text-xs font-normal text-slate-400">
                        ({adminTotalCount})
                      </span>
                    </FormLabel>
                    <div className="flex items-center gap-1">
                      {permissions.canManageAdmins ? (
                        <AddAdmin
                          onUpdated={() =>
                            setPeopleRefreshVersion((value) => value + 1)
                          }
                        />
                      ) : null}
                      <RoomPeopleDialog
                        roomId={room.id}
                        role="admin"
                        creatorId={creatorId}
                        currentUserId={String(currentUser.id)}
                        initialTotalCount={adminTotalCount}
                        canManage={permissions.canManageAdmins}
                        canTransferOwnership={permissions.canTransferOwnership}
                        refreshVersion={peopleRefreshVersion}
                        onAction={setPendingAction}
                      />
                    </div>
                  </div>
                  <PeoplePreview people={admins} />
                </FormControl>

                <FormControl>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <FormLabel className="!mb-0 flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-400" /> Members
                      <span className="text-xs font-normal text-slate-400">
                        ({memberTotalCount})
                      </span>
                    </FormLabel>
                    <div className="flex items-center gap-1">
                      {permissions.canManageMembers ? (
                        <AddMember
                          onUpdated={() =>
                            setPeopleRefreshVersion((value) => value + 1)
                          }
                        />
                      ) : null}
                      <RoomPeopleDialog
                        roomId={room.id}
                        role="member"
                        creatorId={creatorId}
                        currentUserId={String(currentUser.id)}
                        initialTotalCount={memberTotalCount}
                        canManage={permissions.canManageMembers}
                        canTransferOwnership={permissions.canTransferOwnership}
                        refreshVersion={peopleRefreshVersion}
                        onAction={setPendingAction}
                      />
                    </div>
                  </div>
                  <PeoplePreview people={members} />
                </FormControl>

                {!permissions.canEditRoom ? (
                  <Text fontSize="sm" color="gray.400">
                    Only the owner and admins can change group settings.
                  </Text>
                ) : null}
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      <Dialog.Root
        open={Boolean(pendingAction)}
        role="alertdialog"
        onOpenChange={({ open }) => {
          if (!open && !isApplyingAction) setPendingAction(null);
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content className="bg-slate-800 text-slate-50">
              <Dialog.Header>{pendingCopy?.title}</Dialog.Header>
              <Dialog.CloseTrigger disabled={isApplyingAction} />
              <Dialog.Body>
                <Text color="gray.300">{pendingCopy?.description}</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  variant="outline"
                  disabled={isApplyingAction}
                  onClick={() => setPendingAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette={
                    pendingAction?.type === "transfer-owner" ? "orange" : "red"
                  }
                  loading={isApplyingAction}
                  onClick={handleConfirmedAction}
                >
                  {pendingCopy?.confirm}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </React.Fragment>
  );
};
