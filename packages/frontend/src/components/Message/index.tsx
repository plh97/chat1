import { Menu, MenuItem, MenuList, Portal } from "@chakra-ui/react";
import { Item } from "./Item";
import { Scroll } from "./scroll";
import { IoArrowUndoOutline } from "react-icons/io5";
import { recallMessageThunk } from "@/store/action/message";
import { updateRecallMessage } from "@/store/reducer/room";

export function Message({ className }: { className?: string }) {
  const dispatch = useThunkDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const room = useAppSelector((state) => state.room.data);
  const recallMessage = useAppSelector((state) => state.room.recallMessage);
  const myUserInfo = useAppSelector((state) => state.user.data);
  const handleRecall = () => {
    if (!recallMessage) return;
    dispatch(
      recallMessageThunk({
        channelId: recallMessage.channelId,
        recallMessage: {
          operator: myUserInfo.id,
          recallMsgId: recallMessage.id,
        },
      })
    );
    dispatch(updateRecallMessage(undefined));
  };
  return (
    <Scroll>
      <Menu
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      >
        {room.message.map((msg) => (
          <Item key={msg.id} setIsOpen={setIsOpen} data={msg} />
        ))}
        <Portal>
          <MenuList>
            <MenuItem
              onClick={handleRecall}
              className="flex flex-row justify-between"
            >
              Recall <IoArrowUndoOutline className="text-2xl" />
            </MenuItem>
          </MenuList>
        </Portal>
      </Menu>
    </Scroll>
  );
}
