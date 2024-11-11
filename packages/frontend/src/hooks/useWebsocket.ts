import { IWsData, SocketClient, WS_EVENT } from "core";
import { IMessage, IRoom } from "@/interfaces";
import { updateUserRoomReadSeq, topUserRoom, updateUserLastMsg } from "@/store/reducer/user";
import { addMessage, markReadMessage, recallExistMessage, scrollToEnd } from "@/store/reducer/room";
import { MutableRefObject } from "react";

export let ws: SocketClient;

const useSubscribeSendMsg = (roomRef: MutableRefObject<IRoom>) => {
  const dispatch = useAppDispatch();
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
}

const useSubscribeReadMsg = () => {
  const dispatch = useAppDispatch();
  const onReceiveRead = (data: IWsData<IRoom>) => {
    const room = data.data;
    if (room?.id === room.id) {
      dispatch(
        markReadMessage({
          id: room.id,
          readSeq: room.readSeq,
        })
      );
    }
    dispatch(
      updateUserRoomReadSeq({
        id: room.id,
        readSeq: room.readSeq,
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


const useSubscribeRecallMsg = () => {
  const dispatch = useAppDispatch();
  const onReceiveMsg = (data: IWsData<IMessage>) => {
    const msg = data.data;
    dispatch(recallExistMessage(msg));
    dispatch(updateUserLastMsg(msg));
  };
  useEffect(() => {
    ws.eventEmitter.on(WS_EVENT.RECALL_MSG, onReceiveMsg);
    return () => {
      ws.eventEmitter.off(WS_EVENT.RECALL_MSG, onReceiveMsg);
    };
  }, []);
}


export default function useWebsocket() {
  if (
    !ws?.socket ||
    ws?.socket?.readyState === WebSocket.CLOSED ||
    ws?.socket?.readyState === WebSocket.CLOSING
  ) {
    ws = new SocketClient(`wss://47.130.0.227:8080/chat`);
  }
  const room = useAppSelector((state) => state.room.data);
  const roomRef = useRef<IRoom>(room);
  roomRef.current = room;
  useSubscribeSendMsg(roomRef);
  useSubscribeReadMsg();
  useSubscribeRecallMsg();
}
