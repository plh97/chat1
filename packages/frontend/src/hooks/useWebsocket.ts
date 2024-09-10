import { IMessage, IRoom } from "@/interfaces/IMessage";
import { USER } from "@/interfaces/IUser";
import { addMessage, scrollToEnd } from "@/store/reducer/room";
import { setUserInfo } from "@/store/reducer/user";
import { IWsData, SocketClient, WS_EVENT } from "@chatroom/core";
import { useDispatch } from "react-redux";

export type CHANNEL_TYPE = `room:${string}` | `userinfo:${string}`;

export const ws = new SocketClient("/socket.io");

export default function useWebsocket() {
  const dispatch = useDispatch();
  const room = useAppSelector((state) => state.room.data);
  const userinfo = useAppSelector((state) => state.user.data);
  const roomRef = useRef<IRoom>(room);
  const userRef = useRef<USER>(userinfo);
  roomRef.current = room;
  userRef.current = userinfo;
  const onReceiveMsg = (data: IWsData<IMessage>) => {
    const msg = data.data;
    const room = roomRef.current;
    const user = userRef.current;
    const currentRoom = user.room?.find((r) => r._id === msg.channelId);
    if (msg?.channelId === room._id) {
      dispatch(addMessage(msg));
      dispatch(scrollToEnd());
    }
    // update this room to top
    dispatch(
      setUserInfo({
        ...userinfo,
        room: [
          {
            ...currentRoom,
            lastMsg: msg,
          },
          ...(user.room?.filter((r) => r._id !== msg.channelId) ?? []),
        ],
      })
    );
  };
  useEffect(() => {
    ws.eventEmitter.on(WS_EVENT.SEND_MSG, onReceiveMsg);
    return () => {
      ws.eventEmitter.off(WS_EVENT.SEND_MSG, onReceiveMsg);
    };
  }, []);
  return {
    subscribe: ws.subscribe,
    disconnect: ws.close,
  };
}
