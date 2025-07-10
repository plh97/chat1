import { SocketClient, WS_EVENT } from "core";
import { fetchUserInfoThunk } from "@/store/reducer/user";
import { getRoomInfoThunk } from "@/store/reducer/room";

export const useReconnect = (ws: SocketClient) => {
  const toast = useToast();
  const { id = "" } = useParams();
  const dispatch = useAppDispatch();
  const onReconnect = () => {
    toast.closeAll();
    // toast({
    //   duration: 1000,
    //   title: "WS ReConnect",
    //   status: "success",
    //   position: "top",
    // });
    dispatch(fetchUserInfoThunk());
    if (id) {
      dispatch(getRoomInfoThunk(id));
    }
  };
  const onError = () => {
    // toast.closeAll();
    // toast({
    //   isClosable: true,
    //   status: "error",
    //   duration: 99999999999,
    //   position: "top",
    //   title: (
    //     <>
    //       <span>WS Disconnect</span>
    //       <Button
    //         colorScheme="black"
    //         variant="link"
    //         onClick={() => {
    //           ws?.socket?.reconnect();
    //         }}
    //         size="sm"
    //         ml={2}
    //       >
    //         Reconnect
    //       </Button>
    //     </>
    //   ),
    // });
  };
  useEventListener(WS_EVENT.RECONNECT, onReconnect);
  useEventListener(WS_EVENT.DISCONNECT, onError);
};
