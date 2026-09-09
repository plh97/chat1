import { VListHandle } from "virtua";
import {
  appendMoreMessage,
  loadMoreMessage,
  loadRoomCursorMessagesThunk,
  loadRoomMoreMessageThunk,
  markReadMessage as markReadMessageLocally,
  setHasMoreAfter,
  setHasMoreMessage,
} from "@/store/reducer/room";
import { IMessage } from "@/interfaces";
import { queueMarkReadMessage } from "@/store/action/message";
import { updateUserRoomReadSeq } from "@/store/reducer/user";
import { isOwnMessage } from "@/utils";

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

export const focusMessage = (messageId: string, index: number) => {
  window.requestAnimationFrame(() => {
    scrollToMessageIndex(index);
    window.requestAnimationFrame(() => {
      const target = document.querySelector(
        `[data-id="${messageId}"] [data-msg]`
      );
      target?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
      target?.classList.add("brightness-200");
      window.setTimeout(() => target?.classList.remove("brightness-200"), 1200);
    });
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
      const list = scrollEl.current;
      if (!list) return;
      const visibleEndIndex = list.findItemIndex(
        list.scrollOffset + list.viewportSize
      );
      if (visibleEndIndex >= message.length - 1) {
        list.scrollToIndex(message.length, {
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
  const {
    message,
    hasMoreMessage,
    hasMoreBefore,
    hasMoreAfter,
    messageWindowMode,
  } = useAppSelector((state) => state.room.data);
  const { id = "" } = useParams();
  const isPrepend = useRef(false);
  const isRequestingBefore = useRef(false);
  const isRequestingAfter = useRef(false);
  const dispatch = useAppDispatch();
  const requestMoreBefore = async () => {
    if (
      isRequestingBefore.current ||
      !id ||
      !(hasMoreBefore ?? hasMoreMessage)
    ) {
      return;
    }
    isRequestingBefore.current = true;
    const action = messageWindowMode
      ? loadRoomCursorMessagesThunk({
          id,
          direction: "before",
          seq: message[0]?.seq ?? 0,
          pageSize: 50,
        })
      : loadRoomMoreMessageThunk({
          start: message?.length ?? 0,
          pageSize: 50,
          id,
        });
    const { payload } = await dispatch(action as any);
    const nextPage = payload as { message: IMessage[]; hasMore: boolean };
    const nextMessages = nextPage?.message ?? [];
    dispatch(setHasMoreMessage(Boolean(nextPage?.hasMore)));
    if (nextMessages.length) {
      isPrepend.current = true;
      dispatch(loadMoreMessage(nextMessages));
    }
    isRequestingBefore.current = false;
  };

  const requestMoreAfter = async () => {
    if (
      isRequestingAfter.current ||
      !id ||
      !messageWindowMode ||
      !hasMoreAfter
    ) {
      return;
    }
    isRequestingAfter.current = true;
    const { payload } = await dispatch(
      loadRoomCursorMessagesThunk({
        id,
        direction: "after",
        seq: message[message.length - 1]?.seq ?? 0,
        pageSize: 50,
      })
    );
    const nextPage = payload as { message: IMessage[]; hasMore: boolean };
    if (nextPage?.message?.length) {
      dispatch(appendMoreMessage(nextPage.message));
    }
    dispatch(setHasMoreAfter(Boolean(nextPage?.hasMore)));
    isRequestingAfter.current = false;
  };

  const handleScroll = (offset: number) => {
    if (offset < 200) {
      requestMoreBefore();
    }
    const list = sharedScrollEl.current;
    if (list && list.scrollSize - list.viewportSize - offset < 200) {
      requestMoreAfter();
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
    const myUserId = String(myUserInfo?.id || myUserInfo?.userId || "");
    if (!roomId || !myUserId || !isIntersecting) {
      return;
    }

    const readSeqMap = (room.readSeq ?? {}) as Record<string, number>;
    const currentReadSeq = Number(readSeqMap[myUserId] ?? 0);
    const isMyMsg = isOwnMessage(message, myUserInfo);
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
      queueMarkReadMessage({
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
