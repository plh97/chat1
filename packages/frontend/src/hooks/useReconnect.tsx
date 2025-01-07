import { SocketClient, WS_EVENT } from "core";
import { fetchUserInfoThunk } from "@/store/reducer/user";
import { getRoomInfoThunk } from "@/store/reducer/room";
import { ToastId } from "@chakra-ui/react";

export const useReconnect = (ws: SocketClient) => {
  const toastIdRef = useRef<ToastId>(null);
  const toast = useToast();
  const { id = "" } = useParams();
  const dispatch = useAppDispatch();
  const onReconnect = () => {
    toast.close(toastIdRef.current!);
    toastIdRef.current = null;
    toast({
      title: "WS ReConnect",
      status: "success",
      position: "top",
    });
    dispatch(fetchUserInfoThunk());
    if (id) {
      dispatch(getRoomInfoThunk(id));
    }
  };
  const onError = () => {
    console.log(toastIdRef.current);
    if (toastIdRef.current) return;
    toastIdRef.current = toast({
      title: (
        <>
          <span>WS Disconnect</span>
          <Button
            colorScheme="black"
            variant="link"
            onClick={() => {
              ws?.socket?.reconnect();
              toast.close(toastIdRef.current!);
            }}
            size="sm"
            ml={2}
          >
            Reconnect
          </Button>
        </>
      ),
      status: "error",
      duration: 99999999999,
      position: "top",
    });
  };
  useEffect(() => {
    ws.eventEmitter.on(WS_EVENT.RECONNECT, onReconnect);
    ws.eventEmitter.on(WS_EVENT.DISCONNECT, onError);
    return () => {
      ws.eventEmitter.off(WS_EVENT.RECONNECT, onError);
      ws.eventEmitter.off(WS_EVENT.DISCONNECT, onError);
    };
  }, []);
};
