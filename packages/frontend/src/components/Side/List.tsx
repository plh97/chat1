import { joinRoomThunk } from "@/store/reducer/room";
import { Item } from "./Item";
import { Loading } from "./Loading";
import { Link } from "@chakra-ui/react";

export const List = () => {
  const { id = "" } = useParams();
  const dispatch = useAppDispatch();
  const navigation = useNavigate();
  async function handleJoinDefaultRoom() {
    const { payload } = await dispatch<any>(joinRoomThunk({}));
    if (payload.id) {
      navigation(`/room/${payload.id}`);
    }
  }
  const draftMap = useAppSelector((state) => state.user.draftMap);
  const myUserInfo = useAppSelector((state) => state.user.data);
  if (!myUserInfo.id) {
    return <Loading />;
  }
  if (myUserInfo.room?.length === 0) {
    return (
      <ul className="flex-1 overflow-y-auto px-2">
        <p>
          No room found! Do you want to join&nbsp;
          <Link
            color="teal.600"
            type="button"
            onClick={handleJoinDefaultRoom}
            className="font-bold text-md cursor-pointer"
          >
            Common Room
          </Link>
          ?
        </p>
      </ul>
    );
  }
  return (
    <ul className="flex-1 overflow-y-auto px-2">
      {myUserInfo.room?.map((room) => {
        const draft = draftMap[room.id];
        const readSeqMap = (room.readSeq as Record<string, number>) ?? {};
        const myId = myUserInfo.id;
        const readSeq = readSeqMap[myId] ?? 0;
        const unreadCount = room.lastMsg?.seq! - readSeq;
        return (
          <Item
            myId={myId}
            unreadCount={unreadCount}
            draft={draft}
            active={room.id == id}
            key={room.id}
            room={room}
          />
        );
      })}
    </ul>
  );
};
