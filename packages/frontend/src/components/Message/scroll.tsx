import { PropsWithChildren } from "react";
import clsx from "clsx";
import { VList } from "virtua";
import { Loader2 } from "lucide-react";
import {
  scrollToEnd,
  getRoomInfoThunk,
  initialMessage,
} from "@/store/reducer/room";

import { useLoadMore, useScroll } from "./hook";

export const Top = () => {
  const { loadingMessage, data } = useAppSelector((state) => state.room);
  const { hasMoreMessage } = data;
  return (
    <>
      {!hasMoreMessage && !loadingMessage && (
        <div className="text-center m-4">---------- END ----------</div>
      )}
      {loadingMessage && (
        <div className="mt-2 mb-2 w-full flex justify-center">
          <Loader2 className="text-2xl w-8 h-8 text-gray-200 animate-spin dark:text-gray-600" />
          {/* <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.200"
            color="blue.500"
            size="md"
          /> */}
        </div>
      )}
    </>
  );
};

export function Scroll({
  children,
  className,
}: PropsWithChildren<{ readonly className?: string }>) {
  const dispatch = useThunkDispatch();
  const { id = "" } = useParams();
  const { isPrepend, handleScroll } = useLoadMore();
  const { scrollEl } = useScroll();
  const initialScrolledRoomIdRef = useRef("");
  const room = useAppSelector((state) => state.room.data);
  const userInfo = useAppSelector((state) => state.user.data);
  // init message list
  useLayoutEffect(() => {
    if (!id) return;
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
  const { loadingMessage } = useAppSelector((state) => state.room);
  const { message, hasMoreMessage } = useAppSelector(
    (state) => state.room.data
  );

  useLayoutEffect(() => {
    if (!room?.id || !message.length || loadingMessage) {
      return;
    }
    if (initialScrolledRoomIdRef.current === room.id) {
      return;
    }
    initialScrolledRoomIdRef.current = room.id;
    window.requestAnimationFrame(() => {
      scrollEl.current?.scrollToIndex(message.length, {
        align: "end",
      });
    });
  }, [loadingMessage, message.length, room?.id, scrollEl]);

  if (!room?.id || !userInfo?.id) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain px-3.5 py-0 touch-pan-y [WebkitOverflowScrolling:touch]">
        <Loader2 className="text-2xl w-8 h-8 text-gray-200 animate-spin dark:text-gray-600" />
      </div>
    );
  }
  return (
    <VList
      reverse
      shift={isPrepend.current}
      className={clsx(
        "relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3.5 py-0 touch-pan-y [WebkitOverflowScrolling:touch]",
        className
      )}
      ref={scrollEl}
      onScroll={(offset) => {
        if (!loadingMessage && message.length && hasMoreMessage) {
          handleScroll(offset);
        }
      }}
    >
      <Top />
      {children}
    </VList>
  );
}
