import { Loader2 } from "lucide-react";
import {
  scrollToEnd,
  getRoomInfoThunk,
  initialMessage,
} from "@/store/reducer/room";
import { Item } from "./Item";
import { Top } from "./top";
import { useLoadMore } from "./hook";

export function Message() {
  const { id = "" } = useParams();
  const { loadingMessage, data } = useAppSelector((state) => state.room);
  const { message, totalCount } = data;
  const hasMessage = totalCount > message.length;
  const dispatch = useThunkDispatch();
  const { scrollEl, loadMoreTriggerRef } = useLoadMore();
  const myUserInfo = useAppSelector((state) => state.user.data);
  // init message list
  useEffect(() => {
    if (!id) return;
    // 清空旧的信息
    dispatch(initialMessage({ message: [], totalCount: 0 }));
    dispatch(getRoomInfoThunk(id));
  }, [id]);
  useEffect(() => {
    if (myUserInfo?.id) {
      dispatch(scrollToEnd());
    }
  }, [myUserInfo?.id]);
  if (!myUserInfo?.id) {
    return (
      <div className="overflow-y-auto flex-1 relative px-3.5 py-0 overscroll-none flex items-center justify-center flex-col">
        <Loader2 className="text-2xl w-8 h-8 text-gray-200 animate-spin dark:text-gray-600" />
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto flex-1 relative px-3.5 py-0 overscroll-none"
      ref={scrollEl}
    >
      <Top hasMessage={hasMessage} loadingMessage={loadingMessage} />
      <div ref={loadMoreTriggerRef} />
      {message.map((msg) => (
        <Item key={msg.id} data={msg} />
      ))}
    </div>
  );
}
