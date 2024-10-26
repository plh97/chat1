import { IWsData, SocketClient, WS_EVENT } from "core";
import { IMessage, IRoom } from "@/interfaces";
import { updateUserRoomReadSeq, topUserRoom } from "@/store/reducer/user";
import { addMessage, markReadMessage, scrollToEnd } from "@/store/reducer/room";

export let ws: SocketClient;

export default function useWebsocket() {
  if (
    !ws?.socket ||
    ws?.socket?.readyState === WebSocket.CLOSED ||
    ws?.socket?.readyState === WebSocket.CLOSING
  ) {
    ws = new SocketClient("/chat");
  }

  const dispatch = useAppDispatch();
  const room = useAppSelector((state) => state.room.data);
  const roomRef = useRef<IRoom>(room);
  roomRef.current = room;
  const onReceiveMsg = (data: IWsData<IMessage>) => {
    const msg = data.data;
    const room = roomRef.current;
    if (msg?.channelId === room.id) {
      dispatch(addMessage(msg));
      dispatch(scrollToEnd());
    }
    dispatch(topUserRoom(msg));
  };
  useEffect(() => {
    ws.eventEmitter.on(WS_EVENT.SEND_MSG, onReceiveMsg);
    return () => {
      ws.eventEmitter.off(WS_EVENT.SEND_MSG, onReceiveMsg);
    };
  }, []);
  const onReceiveRead = ({ data }: IWsData<IRoom>) => {
    dispatch(
      markReadMessage({
        id: data.id,
        readSeq: data.readSeq,
      })
    );
    dispatch(
      updateUserRoomReadSeq({
        id: data.id,
        readSeq: data.readSeq,
      })
    );
  };
  useEffect(() => {
    ws.eventEmitter.on(WS_EVENT.READ_MSG, onReceiveRead);
    return () => {
      ws.eventEmitter.off(WS_EVENT.READ_MSG, onReceiveRead);
    };
  }, []);
}
