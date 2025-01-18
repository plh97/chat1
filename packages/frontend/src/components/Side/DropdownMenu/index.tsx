import { FaPlus, FaUserFriends } from "react-icons/fa";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AddFriendDialog } from "../AddFriendDialog";
import { AddRoomDialog } from "../AddRoomDialog";
import { FaHouse, FaPerson } from "react-icons/fa6";
import "./styles.css";
import { ProfileDialog } from "../ProfileDialog";

const DropdownMenuDemo = () => {
  const {
    isOpen: isAddFriendOpen,
    onOpen: onAddFriendOpen,
    onClose: onAddFriendClose,
  } = useDisclosure();
  const {
    isOpen: isAddRoomOpen,
    onOpen: onAddRoomOpen,
    onClose: onAddRoomClose,
  } = useDisclosure();
  const {
    isOpen: isProfileOpen,
    onOpen: onProfileOpen,
    onClose: onProfileClose,
  } = useDisclosure();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton
          icon={<FaPlus />}
          className="IconButton"
          aria-label="Customise options"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="DropdownMenuContent z-30"
          sideOffset={5}
        >
          <DropdownMenu.Item
            onClick={() => Promise.resolve().then(onProfileOpen)}
            className="DropdownMenuItem"
          >
            Profile
            <div className="RightSlot">
              <FaPerson />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onClick={() => Promise.resolve().then(onAddFriendOpen)}
            className="DropdownMenuItem"
          >
            Add Friend
            <div className="RightSlot">
              <FaUserFriends />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onClick={() => Promise.resolve().then(onAddRoomOpen)}
            className="DropdownMenuItem"
          >
            Add Room
            <div className="RightSlot">
              <FaHouse />
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
      <AddFriendDialog isOpen={isAddFriendOpen} onClose={onAddFriendClose} />
      <AddRoomDialog isOpen={isAddRoomOpen} onClose={onAddRoomClose} />
      <ProfileDialog isOpen={isProfileOpen} onClose={onProfileClose} />
    </DropdownMenu.Root>
  );
};

export default DropdownMenuDemo;
