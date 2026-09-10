import { joinRoomThunk } from "@/store/reducer/room";
import { Item } from "./Item";
import { Loading } from "./Loading";
import { Link } from "@/components/ui/chakra-compat";
import { isRoomListLoading } from "@/utils/roomList";

export const List = () => {
  const { id = "" } = useParams();
  const dispatch = useAppDispatch();
  const navigation = useNavigate();
  async function handleJoinDefaultRoom() {
    const result = await dispatch(joinRoomThunk({}));
    if (joinRoomThunk.fulfilled.match(result) && result.payload.id) {
      navigation(`/room/${result.payload.id}`);
    }
  }
  const {
    auth,
    data: myUserInfo,
    draftMap,
  } = useAppSelector((state) => state.user);
  if (isRoomListLoading(auth, myUserInfo.id)) {
    return (
      <nav aria-label="Chat list" className="min-h-0 flex-1 overflow-hidden">
        <Loading />
      </nav>
    );
  }
  if (myUserInfo.room?.length === 0) {
    return (
      <nav
        aria-label="Chat list"
        className="app-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [WebkitOverflowScrolling:touch] md:px-2"
      >
        <p>
          No room found! Do you want to join&nbsp;
          <Link
            color="teal.600"
            type="button"
            onClick={handleJoinDefaultRoom}
            className="cursor-pointer text-md font-bold active:opacity-70"
          >
            Common Room
          </Link>
          ?
        </p>
      </nav>
    );
  }
  return (
    <nav
      aria-label="Chat list"
      className="app-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 [WebkitOverflowScrolling:touch]"
    >
      <ul>
        {myUserInfo.room
          ?.filter((room) => room?.id != null)
          .map((room) => {
            const draft = draftMap[room.id];
            const readSeqMap = (room.readSeq as Record<string, number>) ?? {};
            const myId = myUserInfo.id;
            const readSeq = readSeqMap[myId] ?? 0;
            const fallbackUnreadCount =
              room.lastMsg && room.lastMsg.userId !== myId
                ? room.lastMsg.seq - readSeq
                : 0;
            const unreadCount = Math.max(
              0,
              Number(room.unreadCount ?? fallbackUnreadCount)
            );
            return (
              <Item
                myId={myId}
                unreadCount={unreadCount}
                draft={draft}
                active={room.id == id}
                key={String(room.id)}
                room={room}
              />
            );
          })}
      </ul>
    </nav>
  );
};
