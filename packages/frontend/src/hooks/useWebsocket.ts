import { getToken, SocketClient } from "@/core";
import { IRoom } from "@/interfaces";
import { wsUrl } from "@/config";

export let ws: SocketClient;

export default function useWebsocket(roomId = "") {
  const authToken = getToken();
  const tokenChanged = Boolean(ws && ws.authToken !== authToken);
  if (tokenChanged) {
    ws?.destroy();
  }
  if (
    tokenChanged ||
    !ws?.socket ||
    ws?.socket?.readyState === WebSocket.CLOSED ||
    ws?.socket?.readyState === WebSocket.CLOSING
  ) {
    ws = new SocketClient({ url: wsUrl });
  }
  const room = useAppSelector((state) => state.room.data);
  const roomRef = useRef<IRoom>(room);
  roomRef.current = room;
  useReceiveMsg(roomRef);
  useReconnect(ws, roomId);
}
