import {
  Children,
  PropsWithChildren,
  ReactElement,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { useParams } from "react-router-dom";
import clsx from "clsx";
import { VList, VListHandle } from "virtua";
import { Loader2 } from "lucide-react";
import { useAppSelector, useThunkDispatch } from "@/hooks/app";
import {
  scrollToEnd,
  getRoomInfoThunk,
  initialMessage,
} from "@/store/reducer/room";
import type { MessageLoadingKind } from "@/store/reducer/room";

import { useLoadMore, useScroll } from "./hook";

const MESSAGE_SCROLL_VIEWPORT_ID = "message-scroll-viewport";

export const Top = () => {
  const { loadingMessageKind, data } = useAppSelector((state) => state.room);
  const { hasMoreMessage } = data;
  const loadingBefore = loadingMessageKind === "before";
  return (
    <div className="flex h-12 w-full flex-none items-center justify-center">
      {!hasMoreMessage && !loadingBefore ? (
        <span className="text-center">---------- END ----------</span>
      ) : null}
      {loadingBefore ? (
        <span
          role="status"
          aria-label="Loading earlier messages"
          className="inline-flex h-8 w-8 items-center justify-center"
        >
          <Loader2
            aria-hidden="true"
            className="h-8 w-8 animate-spin text-gray-600"
          />
        </span>
      ) : null}
    </div>
  );
};

export const shouldCenterMessageLoader = ({
  roomId,
  userId,
  messageCount,
  loadingMessageKind,
}: {
  roomId?: string;
  userId?: string;
  messageCount: number;
  loadingMessageKind: MessageLoadingKind | null;
}) =>
  !roomId ||
  !userId ||
  (loadingMessageKind === "initial" && messageCount === 0);

const CenteredMessageLoader = () => (
  <div
    role="status"
    aria-label="Loading messages"
    className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
  >
    <Loader2
      aria-hidden="true"
      className="h-8 w-8 animate-spin text-gray-600"
    />
  </div>
);

export function Scroll({
  children,
  className,
}: PropsWithChildren<{ readonly className?: string }>) {
  const dispatch = useThunkDispatch();
  const { id = "" } = useParams();
  const { isPrepend, handleScroll } = useLoadMore();
  const { scrollEl } = useScroll();
  const requestedRoomIdRef = useRef("");
  const initialScrolledRoomIdRef = useRef("");
  const room = useAppSelector((state) => state.room.data);
  const userInfo = useAppSelector((state) => state.user.data);
  const setScrollEl = useCallback(
    (list: VListHandle | null) => {
      scrollEl.current = list;
      if (
        !list ||
        !room?.id ||
        !room.message.length ||
        initialScrolledRoomIdRef.current === room.id
      ) {
        return;
      }
      list.scrollToIndex(room.message.length, { align: "end" });
      const viewport = document.getElementById(MESSAGE_SCROLL_VIEWPORT_ID);
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    },
    [room?.id, room.message.length, scrollEl]
  );
  // init message list
  useLayoutEffect(() => {
    if (!id || requestedRoomIdRef.current === id) return;
    requestedRoomIdRef.current = id;
    initialScrolledRoomIdRef.current = "";
    // 清空旧的信息
    dispatch(
      initialMessage({
        message: [],
        totalCount: 0,
        hasMoreMessage: true,
        id: undefined,
      })
    );
    dispatch(getRoomInfoThunk(id)).then(() => {
      dispatch(scrollToEnd(false));
    });
  }, [id]);
  const { loadingMessage, loadingMessageKind } = useAppSelector(
    (state) => state.room
  );
  const { message, hasMoreMessage, hasMoreBefore, hasMoreAfter } =
    useAppSelector((state) => state.room.data);

  useLayoutEffect(() => {
    if (!room?.id || !message.length) {
      return;
    }
    if (initialScrolledRoomIdRef.current === room.id) {
      return;
    }
    const scrollToInitialEnd = () => {
      const list = scrollEl.current;
      if (list) {
        list.scrollToIndex(message.length, {
          align: "end",
        });
        // The virtual list can update its total size after measuring the
        // newly rendered rows. Re-align for a few frames while it settles.
        list.scrollTo(list.scrollSize);
      }
      const viewport = document.getElementById(MESSAGE_SCROLL_VIEWPORT_ID);
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    };

    const frame = window.requestAnimationFrame(scrollToInitialEnd);
    const settleTimers = [100, 300, 600].map((delay) =>
      window.setTimeout(scrollToInitialEnd, delay)
    );
    const completionTimer = window.setTimeout(() => {
      scrollToInitialEnd();
      initialScrolledRoomIdRef.current = room.id;
    }, 650);
    return () => {
      window.cancelAnimationFrame(frame);
      settleTimers.forEach(window.clearTimeout);
      window.clearTimeout(completionTimer);
    };
  }, [loadingMessage, message.length, room?.id, scrollEl]);

  if (
    shouldCenterMessageLoader({
      roomId: room?.id,
      userId: userInfo?.id,
      messageCount: message.length,
      loadingMessageKind,
    })
  ) {
    return <CenteredMessageLoader />;
  }

  const items = Children.toArray([
    <Top key="message-list-top" />,
    children,
  ]) as ReactElement[];

  return (
    <VList
      id={MESSAGE_SCROLL_VIEWPORT_ID}
      data={items}
      shift={isPrepend.current}
      className={clsx(
        "app-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3.5 py-0 touch-pan-y [WebkitOverflowScrolling:touch]",
        className
      )}
      ref={setScrollEl}
      onScroll={(offset) => {
        if (
          initialScrolledRoomIdRef.current === room.id &&
          !loadingMessage &&
          message.length &&
          ((hasMoreBefore ?? hasMoreMessage) || hasMoreAfter)
        ) {
          handleScroll(offset);
        }
      }}
    >
      {(item, index) =>
        item ?? <div key={`message-list-placeholder-${index}`} aria-hidden />
      }
    </VList>
  );
}
