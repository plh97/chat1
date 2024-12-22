import { SocketClient } from "core";
import { IRoom } from "@/interfaces";
import { wsUrl } from "@/config";

export let ws: SocketClient;

export default function useWebsocket() {
  if (
    !ws?.socket ||
    ws?.socket?.readyState === WebSocket.CLOSED ||
    ws?.socket?.readyState === WebSocket.CLOSING
  ) {
    ws = new SocketClient({ url: wsUrl, reconnectTime: 5000 });
  }
  const room = useAppSelector((state) => state.room.data);
  const roomRef = useRef<IRoom>(room);
  roomRef.current = room;
  useReceiveMsg(roomRef);
  useReconnect();
}
