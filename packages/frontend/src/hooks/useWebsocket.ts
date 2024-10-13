import { IMessage, IUser, IRoom } from "@/interfaces";
import { addMessage, scrollToEnd } from "@/store/reducer/room";
import { setUserInfo } from "@/store/reducer/user";
import { IWsData, SocketClient, WS_EVENT } from "core";
import { useDispatch } from "react-redux";

export let ws: SocketClient;

export default function useWebsocket() {
  if (
    !ws?.socket ||
    ws?.socket?.readyState === WebSocket.CLOSED ||
    ws?.socket?.readyState === WebSocket.CLOSING
  ) {
    ws = new SocketClient("/chat");
  }

  const dispatch = useDispatch();
  const room = useAppSelector((state) => state.room.data);
  const userinfo = useAppSelector((state) => state.user.data);
  const roomRef = useRef<IRoom>(room);
  const userRef = useRef<IUser>(userinfo);
  roomRef.current = room;
  userRef.current = userinfo;
  const onReceiveMsg = (data: IWsData<IMessage>) => {
    const msg = data.data;
    const room = roomRef.current;
    const user = userRef.current;
    const currentRoom = user.room?.find((r) => r.id === msg.channelId);
    if (msg?.channelId === room.id) {
      dispatch(addMessage(msg));
      dispatch(scrollToEnd());
    }
    const userInfo = {
      room: [
        {
          ...currentRoom,
          lastMsg: msg,
        },
        ...(user.room?.filter((r) => r.id !== msg.channelId) ?? []),
      ],
    };
    dispatch(setUserInfo(userInfo));
  };
  useEffect(() => {
    ws.eventEmitter.on(WS_EVENT.SEND_MSG, onReceiveMsg);
    return () => {
      ws.eventEmitter.off(WS_EVENT.SEND_MSG, onReceiveMsg);
    };
  }, []);
}
