import { PropsWithChildren } from "react";
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
  const { message, totalCount } = data;
  const hasMessage = totalCount > message.length;
  return (
    <>
      {!hasMessage && !loadingMessage && (
        <div className="text-center m-4">---------- END ----------</div>
      )}
      {loadingMessage && (
        <div className="mt-2 mb-2 right-0 top-0 absolute w-full flex justify-center">
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

export function Scroll({ children }: PropsWithChildren) {
  const dispatch = useThunkDispatch();
  const { id = "" } = useParams();
  const { isPrepend, handleScroll } = useLoadMore();
  const { scrollEl } = useScroll();
  const myUserInfo = useAppSelector((state) => state.user.data);
  // init message list
  useEffect(() => {
    if (!id) return;
    // 清空旧的信息
    dispatch(initialMessage({ message: [], totalCount: 0 }));
    dispatch(getRoomInfoThunk(id)).then(() => {
      dispatch(scrollToEnd(false));
    });
  }, [id]);
  const { loadingMessage } = useAppSelector((state) => state.room);
  const { message, totalCount } = useAppSelector((state) => state.room.data);
  const hasMessage = totalCount > message.length;
  if (!myUserInfo?.id) {
    return (
      <div className="overflow-y-auto flex-1 relative px-3.5 py-0 flex items-center justify-center flex-col">
        <Loader2 className="text-2xl w-8 h-8 text-gray-200 animate-spin dark:text-gray-600" />
      </div>
    );
  }
  return (
    <VList
      reverse
      shift={isPrepend.current}
      className="overflow-y-auto flex-1 relative px-3.5 py-0"
      ref={scrollEl}
      onScroll={(offset) => {
        if (!loadingMessage && message.length && hasMessage) {
          handleScroll(offset);
        }
      }}
    >
      <Top />
      {children}
    </VList>
  );
}
