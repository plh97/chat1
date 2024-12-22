import { WS_EVENT } from "core";
import { fetchUserInfoThunk } from "@/store/reducer/user";
import { getRoomInfoThunk } from "@/store/reducer/room";

export const useReconnect = () => {
  const { id = "" } = useParams();
  const dispatch = useAppDispatch();
  const onReconnect = () => {
    dispatch(fetchUserInfoThunk());
    if (id) {
      dispatch(getRoomInfoThunk(id));
    }
  };
  useEffect(() => {
    ws.eventEmitter.on(WS_EVENT.RECONNECT, onReconnect);
    return () => {
      ws.eventEmitter.off(WS_EVENT.RECONNECT, onReconnect);
    };
  }, []);
};
