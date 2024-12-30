import { Menu, MenuItem, MenuList, Portal } from "@chakra-ui/react";
import { Item } from "./Item";
import { Scroll } from "./scroll";
import { IoArrowUndoOutline, IoCopy } from "react-icons/io5";
import { recallMessageThunk } from "@/store/action/message";
import { updateRecallMessage } from "@/store/reducer/room";

export function Message() {
  const toast = useToast();
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
  const handleCopy = () => {
    const content = recallMessage?.textMessage?.text;
    if (!content) return;
    navigator.clipboard.writeText(recallMessage.textMessage!.text);
    toast({
      description: `Copy [${content}] successfully`,
      status: "success",
      position: "top",
      duration: 1000,
    });
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
              className="flex flex-row justify-between box-border"
            >
              Recall <IoArrowUndoOutline className="text-2xl" />
            </MenuItem>
            {recallMessage?.contentType === "TEXT_MESSAGE" && (
              <MenuItem
                onClick={handleCopy}
                className="flex flex-row justify-between box-border"
              >
                Copy <IoCopy className="text-2xl" />
              </MenuItem>
            )}
          </MenuList>
        </Portal>
      </Menu>
    </Scroll>
  );
}
