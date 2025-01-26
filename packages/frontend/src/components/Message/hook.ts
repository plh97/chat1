import { VListHandle } from "virtua";
import {
  loadMoreMessage,
  loadRoomMoreMessageThunk,
} from "@/store/reducer/room";
import { IMessage } from "@/interfaces";
import { markReadMessageThunk } from "@/store/action/message";

export const useScroll = () => {
  const scrollEl = useRef<VListHandle>(null);
  const {
    scrollToTop,
    scrollToEnd,
    data: { message },
  } = useAppSelector((state) => state.room);
  const virtual = scrollEl.current;
  const handleScrollToTop = () => {
    if (scrollToTop === undefined) return;
    virtual?.scrollTo(0);
  };
  const handleScrollToBottom = (stick = false) => {
    if (scrollToEnd === undefined) return;
    if (stick) {
      if (virtual?.findEndIndex() === message.length - 1) {
        virtual?.scrollToIndex(message.length, {
          align: "end",
        });
      }
      return;
    }
    virtual?.scrollToIndex(message.length, {
      align: "end",
    });
  };
  useEffect(() => {
    handleScrollToTop();
  }, [scrollToTop]);
  useEffect(() => {
    handleScrollToBottom(scrollToEnd! > 0);
  }, [scrollToEnd]);
  return {
    scrollEl,
  };
};

export const useLoadMore = () => {
  const { message } = useAppSelector((state) => state.room.data);
  const { id = "" } = useParams();
  const isPrepend = useRef(false);
  const dispatch = useAppDispatch();
  const requestMore = async () => {
    const { payload } = await dispatch(
      loadRoomMoreMessageThunk({
        start: message?.length ?? 0,
        pageSize: 20,
        id: id,
      })
    );
    isPrepend.current = true;
    dispatch(loadMoreMessage(payload as IMessage[]));
  };
  const handleScroll = (offset: number) => {
    if (offset < 1000) {
      requestMore();
    }
  };
  useLayoutEffect(() => {
    isPrepend.current = false;
  });
  return {
    handleScroll,
    isPrepend,
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
