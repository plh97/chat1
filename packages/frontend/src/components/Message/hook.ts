import {
  IState,
  loadMoreMessage,
  loadRoomMoreMessageThunk,
} from "@/store/reducer/room";
import { IMessage, IRoom } from "@/interfaces";
import { markReadMessageThunk } from "@/store/action/message";

export const useScroll = () => {
  const scrollEl = useRef<HTMLDivElement>(null);
  const { scrollToTop, scrollToEnd } = useAppSelector((state) => state.room);
  const handleScrollToTop = () => {
    if (scrollEl.current?.scrollTop !== undefined) {
      scrollEl.current?.scrollTo({ top: 0 });
    }
  };
  const handleScrollToBottom = () => {
    scrollEl.current?.scrollTo({ top: 999999999 });
  };
  const getBottomSpace = () => {
    if (scrollEl.current?.scrollTop !== undefined) {
      return scrollEl.current.scrollHeight - scrollEl.current.scrollTop;
    }
    return NaN;
  };
  const getTopSpace = () => {
    return scrollEl.current?.scrollTop;
  };
  useEffect(() => {
    handleScrollToTop();
  }, [scrollToTop]);
  useEffect(() => {
    handleScrollToBottom();
  }, [scrollToEnd]);
  return {
    getTopSpace,
    getBottomSpace,
    handleScrollToTop,
    handleScrollToBottom,
    scrollEl,
  };
};

export const useLoadMore = () => {
  const { loadingMessage } = useAppSelector<IState>((state) => state.room);
  const { message, totalCount } = useAppSelector<IRoom>(
    (state) => state.room.data
  );
  const hasMessage = totalCount > message.length;
  const dispatch = useThunkDispatch();
  const { id = "" } = useParams();
  const { getBottomSpace, getTopSpace, scrollEl } = useScroll();
  const [distanceToBottom, setDistanceToBottom] = useState<number | null>(null);
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.5,
    rootMargin: "200%",
  });
  const requestMore = async () => {
    const { payload } = await dispatch(
      loadRoomMoreMessageThunk({
        start: message?.length ?? 0,
        pageSize: 20,
        id: id,
      })
    );
    const distanceToTop = getTopSpace();
    // @ts-ignore
    dispatch(loadMoreMessage(payload));
    if (Number(distanceToTop) === 0) {
      setDistanceToBottom(getBottomSpace());
    }
  };
  useEffect(() => {
    if (isIntersecting && !loadingMessage && message.length && hasMessage) {
      console.log("load more");
      requestMore();
    }
  }, [isIntersecting]);

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
  return {
    scrollEl,
    loadMoreTriggerRef: ref,
  };
};

let timer: NodeJS.Timeout;
const debounce = (fn: Function, delay = 100) => {
  return (...args: any) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

export const useMsgWatch = (message: IMessage) => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const readSeq = room?.readSeq;
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.5,
  });
  const dispatch = useAppDispatch();
  const debounceRead = debounce(() => {
    const readSeqMap = room.readSeq as Record<string, number>;
    const isRead = readSeqMap[myUserInfo.id] >= message.seq;
    const isMyMsg = myUserInfo.id === message.userId;
    if (!isRead && isIntersecting && !isMyMsg) {
      dispatch(
        markReadMessageThunk({
          channelId: room.id,
          readMessage: {
            operator: myUserInfo.id,
            lastReadSeq: message.seq,
            readSeq: {},
          },
        })
      );
    }
  }, 100);
  useEffect(() => {
    debounceRead();
  }, [readSeq, isIntersecting]);
  return ref;
};
