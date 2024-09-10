import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/app";
import useScroll from "@/hooks/useScroll";
import {
  getRoomInfoThunk,
  initialMessage,
  IState,
  loadMoreMessage,
  loadRoomMoreMessageThunk,
} from "@/store/reducer/room";
import { throttle } from "@/utils";
import { Item } from "./Item";
import { Top } from "./top";


export function Message() {
  const scrollEl = useRef<HTMLDivElement>(null);
  const {
    data: { message, totalCount },
    loadingMessage,
  } = useAppSelector<IState>((state) => state.room);
  const hasMessage = totalCount > message.length;
  const dispatch = useAppDispatch();
  const { id = "" } = useParams();
  const { getBottomSpace, getTopSpace } = useScroll(scrollEl);
  const [distanceToBottom, setDistanceToBottom] = useState<number | null>(null);
  useEffect(() => {
    if (!id) return;
    // 清空旧的信息
    dispatch(initialMessage({ message: [], totalCount: 0 }));
    dispatch(getRoomInfoThunk(id) as any);
  }, [id]);
  const handleScroll = async () => {
    // 如果滚动到了顶部
    if (
      message.length > 0 &&
      Number(scrollEl.current?.scrollTop) < 300 &&
      !loadingMessage &&
      hasMessage
    ) {
      const { payload } = await dispatch<any>(
        loadRoomMoreMessageThunk({
          start: message?.length ?? 0,
          pageSize: 20,
          _id: id,
        })
      );
      const distanceToTop = getTopSpace();
      dispatch(loadMoreMessage(payload));
      if (Number(distanceToTop) === 0) {
        setDistanceToBottom(getBottomSpace());
      }
    }
  };

  useLayoutEffect(() => {
    if (
      scrollEl.current?.scrollTop !== undefined &&
      distanceToBottom !== null
    ) {
      scrollEl.current.scrollTop =
        scrollEl.current.scrollHeight - distanceToBottom;
      setDistanceToBottom(null);
    }
  }, [distanceToBottom]);

  return (
    <div
      className="overflow-y-auto flex-1 relative px-3.5 py-0 overscroll-none"
      ref={scrollEl}
      onScroll={throttle(handleScroll)}
    >
      <Top hasMessage={hasMessage} loadingMessage={loadingMessage} />
      {message.map((msg) => (
        <Item key={msg._id} data={msg} />
      ))}
    </div>
  );
}
