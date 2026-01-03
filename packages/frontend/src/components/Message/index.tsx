import { Menu, MenuItem, MenuList, Portal } from "@chakra-ui/react";
import { Item } from "./Item";
import { Scroll } from "./scroll";
import { IoCopy } from "react-icons/io5";
import { recallMessageThunk } from "@/store/action/message";
import {
  updateReplyMessage,
  updateSelectedMessage,
} from "@/store/reducer/room";
import { FaRegTrashAlt, FaReply } from "react-icons/fa";

export function Message({}: { className?: string }) {
  const toast = useToast();
  const dispatch = useThunkDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const room = useAppSelector((state) => state.room.data);
  const selectedMessage = useAppSelector((state) => state.room.selectedMessage);
  const myUserInfo = useAppSelector((state) => state.user.data);
  const isMe = myUserInfo?.userId === selectedMessage?.user.id;
  const handleRecall = () => {
    if (!selectedMessage) return;
    dispatch(
      recallMessageThunk({
        channelId: selectedMessage.channelId,
        recallMessage: {
          operator: myUserInfo.userId,
          recallMsgId: selectedMessage.id,
        },
      })
    );
    dispatch(updateSelectedMessage(undefined));
  };
  const handleCopy = () => {
    const content = selectedMessage?.textMessage?.text;
    if (!content) return;
    navigator.clipboard.writeText(selectedMessage.textMessage!.text);
    toast({
      description: `Copy [${content}] successfully`,
      status: "success",
      position: "top",
      duration: 1000,
    });
  };
  const handleReply = () => {
    if (!selectedMessage) return;
    dispatch(updateReplyMessage(selectedMessage));
  };
  const menuList = useMemo(() => {
    const config = [];
    if (isMe) {
      config.push({
        label: "Recall",
        onClick: handleRecall,
        icon: <FaRegTrashAlt className="text-2xl" />,
      });
    }
    if (selectedMessage?.contentType === "TEXT_MESSAGE") {
      config.push({
        label: "Copy",
        onClick: handleCopy,
        icon: <IoCopy className="text-2xl" />,
      });
    }
    if (
      ["TEXT_MESSAGE", "MEDIA_MESSAGE"].includes(
        selectedMessage?.contentType ?? ""
      )
    ) {
      config.push({
        label: "Reply",
        onClick: handleReply,
        icon: <FaReply className="text-2xl" />,
      });
    }
    return config;
  }, [selectedMessage]);
  return (
    <Menu
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
      }}
    >
      <Scroll>
        {room.message.map((msg) => (
          <Item key={msg.id} setIsOpen={setIsOpen} data={msg} />
        ))}
      </Scroll>
      <Portal>
        <MenuList>
          {menuList.map((item) => (
            <MenuItem
              key={item.label}
              onClick={item.onClick}
              className="flex flex-row justify-between box-border"
            >
              {item.label} {item.icon}
            </MenuItem>
          ))}
        </MenuList>
      </Portal>
    </Menu>
  );
}
