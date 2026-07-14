import { VListHandle } from "virtua";
import {
  loadMoreMessage,
  loadRoomMoreMessageThunk,
  markReadMessage as markReadMessageLocally,
  setHasMoreMessage,
} from "@/store/reducer/room";
import { IMessage } from "@/interfaces";
import { markReadMessageThunk } from "@/store/action/message";
import { updateUserRoomReadSeq } from "@/store/reducer/user";

const sharedScrollEl: { current: VListHandle | null } = {
  current: null,
};

export const scrollToMessageIndex = (index: number) => {
  if (index < 0) return;
  sharedScrollEl.current?.scrollToIndex(index + 1, {
    align: "center",
    smooth: true,
  });
};

export const useScroll = () => {
  const scrollEl = sharedScrollEl;
  const {
    scrollToTop,
    scrollToEnd,
    data: { message },
  } = useAppSelector((state) => state.room);
  const handleScrollToTop = () => {
    if (scrollToTop === undefined) return;
    scrollEl.current?.scrollTo(0);
  };
  const handleScrollToBottom = (stick = false) => {
    if (scrollToEnd === undefined) return;
    if (stick) {
      if (
        scrollEl.current?.findEndIndex() !== undefined &&
        scrollEl.current.findEndIndex() >= message.length - 1
      ) {
        scrollEl.current?.scrollToIndex(message.length, {
          align: "end",
          smooth: true,
        });
      }
      return;
    }
    scrollEl.current?.scrollToIndex(message.length, {
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
  const isRequesting = useRef(false);
  const dispatch = useAppDispatch();
  const requestMore = async () => {
    if (isRequesting.current || !id) {
      return;
    }
    isRequesting.current = true;
    const { payload } = await dispatch(
      loadRoomMoreMessageThunk({
        start: message?.length ?? 0,
        pageSize: 50,
        id: id,
      })
    );
    const nextPage = payload as { message: IMessage[]; hasMore: boolean };
    const nextMessages = nextPage?.message ?? [];
    dispatch(setHasMoreMessage(Boolean(nextPage?.hasMore)));
    if (nextMessages.length) {
      isPrepend.current = true;
      dispatch(loadMoreMessage(nextMessages));
    }
    isRequesting.current = false;
  };
  const handleScroll = (offset: number) => {
    if (offset < 200) {
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

export const useMsgWatch = (message: IMessage) => {
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.5,
  });
  const dispatch = useAppDispatch();
  const lastReportedSeqRef = useRef(0);

  useEffect(() => {
    const roomId = room?.id;
    const myUserId = myUserInfo?.userId;
    if (!roomId || !myUserId || !isIntersecting) {
      return;
    }

    const readSeqMap = (room.readSeq ?? {}) as Record<string, number>;
    const currentReadSeq = Number(readSeqMap[myUserId] ?? 0);
    const isMyMsg = myUserId === message.userId;
    if (isMyMsg || currentReadSeq >= message.seq) {
      return;
    }
    if (lastReportedSeqRef.current >= message.seq) {
      return;
    }

    const nextReadSeq = {
      [myUserId]: message.seq,
    };

    lastReportedSeqRef.current = message.seq;
    dispatch(
      markReadMessageLocally({
        id: roomId,
        readSeq: nextReadSeq,
      })
    );
    dispatch(
      updateUserRoomReadSeq({
        channelId: roomId,
        readMessage: {
          operator: myUserId,
          lastReadSeq: message.seq,
          readSeq: nextReadSeq,
        },
      })
    );
    dispatch(
      markReadMessageThunk({
        channelId: roomId,
        readMessage: {
          operator: myUserId,
          lastReadSeq: message.seq,
          readSeq: nextReadSeq,
        },
      })
    );
  }, [
    dispatch,
    isIntersecting,
    message.seq,
    message.userId,
    myUserInfo?.userId,
    room?.id,
    room?.readSeq,
  ]);
  return ref;
};
