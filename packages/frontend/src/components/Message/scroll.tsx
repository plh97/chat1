import {
  scrollToEnd,
  getRoomInfoThunk,
  initialMessage,
} from "@/store/reducer/room";
import { Loader2 } from "lucide-react";
import { useLoadMore } from "./hook";
import { PropsWithChildren } from "react";

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
  const { scrollEl, loadMoreTriggerRef } = useLoadMore();
  const myUserInfo = useAppSelector((state) => state.user.data);
  // init message list
  useEffect(() => {
    if (!id) return;
    // 清空旧的信息
    dispatch(initialMessage({ message: [], totalCount: 0 }));
    dispatch(getRoomInfoThunk(id));
  }, [id]);
  useEffect(() => {
    if (myUserInfo?.id) {
      dispatch(scrollToEnd());
    }
  }, [myUserInfo?.id]);
  if (!myUserInfo?.id) {
    return (
      <div className="overflow-y-auto flex-1 relative px-3.5 py-0 flex items-center justify-center flex-col">
        <Loader2 className="text-2xl w-8 h-8 text-gray-200 animate-spin dark:text-gray-600" />
      </div>
    );
  }
  return (
    <div
      className="overflow-y-auto flex-1 relative px-3.5 py-0"
      ref={scrollEl}
    >
      <Top />
      <div
        data-load
        ref={loadMoreTriggerRef}
        style={{
          margin: "200px",
          position: "absolute",
        }}
      />
      {children}
    </div>
  );
}
