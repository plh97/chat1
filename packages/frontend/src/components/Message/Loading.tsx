import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/app";
import useScroll from "@/hooks/useScroll";
import {
  getRoomInfoThunk,
  initialMessage,
  IState,
  loadMoreMessage,
  loadRoomMoreMessageThunk,
  scrollToEnd,
} from "@/store/reducer/room";
import { throttle } from "@/utils";
import { Item, SkeletonItem } from "./Item";
import { Top } from "./top";
import { USER } from "@/interfaces/IUser";
import { useCheckboxGroup } from "@chakra-ui/react";

export function Message() {
  const scrollEl = useRef<HTMLDivElement>(null);
  const {
    data: { message, totalCount },
    loadingMessage,
  } = useAppSelector<IState>((state) => state.room);
  const hasMessage = totalCount > message.length;
  const dispatch = useThunkDispatch();
  const { id = "" } = useParams();
  const { getBottomSpace, getTopSpace } = useScroll(scrollEl);
  const [distanceToBottom, setDistanceToBottom] = useState<number | null>(null);
  useEffect(() => {
    if (!id) return;
    // 清空旧的信息
    dispatch(initialMessage({ message: [], totalCount: 0 }));
    dispatch(getRoomInfoThunk(id));
  }, [id]);
  const handleScroll = async () => {
    // 如果滚动到了顶部
    if (
      message.length > 0 &&
      Number(scrollEl.current?.scrollTop) < 300 &&
      !loadingMessage &&
      hasMessage
    ) {
      const { payload } = await dispatch(
        loadRoomMoreMessageThunk({
          start: message?.length ?? 0,
          pageSize: 20,
          id: id,
        })
      );
      const distanceToTop = getTopSpace();
      dispatch(loadMoreMessage(payload as any));
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

  const myUserInfo = useAppSelector<Partial<USER>>((state) => {
    return state.user.data;
  });
  useEffect(() => {
    if (myUserInfo?.id) {
      dispatch(scrollToEnd());
    }
  }, [myUserInfo?.id]);
  if (!myUserInfo?.id) {
    return (
      <div className="overflow-y-auto flex-1 relative px-3.5 py-0 overscroll-none flex items-center justify-center">
        {/* <Loader2 className="text-2xl w-8 h-8 text-gray-200 animate-spin dark:text-gray-600" /> */}
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto flex-1 relative px-3.5 py-0 overscroll-none"
      ref={scrollEl}
      onScroll={throttle(handleScroll)}
    >
      <Top hasMessage={hasMessage} loadingMessage={loadingMessage} />
      {message.map((msg) => (
        <Item key={msg.id} data={msg} />
      ))}
    </div>
  );
}
