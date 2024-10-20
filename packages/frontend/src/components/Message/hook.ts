import {
  IState,
  loadMoreMessage,
  loadRoomMoreMessageThunk,
} from "@/store/reducer/room";
import { IRoom } from "@/interfaces";

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
