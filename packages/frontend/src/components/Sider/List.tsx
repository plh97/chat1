import { Dispatch } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { USER } from "@/interfaces/IUser";
import { RootState } from "@/store/index";
import { joinRoomThunk } from "@/store/reducer/room";
import { Item } from "./Item";
import { Loading } from "./Loading";

export const List = () => {
  const { id = "" } = useParams();
  const dispatch = useDispatch<Dispatch<any>>();
  const navigation = useNavigate();
  async function handleJoinDefaultRoom() {
    const { payload } = await dispatch<any>(joinRoomThunk({}));
    if (payload._id) {
      navigation(`/room/${payload._id}`);
    }
  }
  const user = useAppSelector((state) => {
    return state.user;
  });
  const myUserInfo = useAppSelector((state) => {
    return state.user.data;
  });
  if (myUserInfo.room === null) {
    return <Loading />;
  }
  if (myUserInfo.room?.length === 0) {
    return (
      <ul className="flex-1 overflow-y-auto px-2">
        <p>
          you haven&apos;t joined any room now! Do you want to join a&nbsp;
          <strong
            className="text-blue-600	text-sm	cursor-pointer"
            onClick={handleJoinDefaultRoom}
          >
            LOBBY Room
          </strong>
          ?
        </p>
      </ul>
    );
  }
  const draftMap = user.draftMap;
  return (
    <ul className="flex-1 overflow-y-auto px-2">
      {myUserInfo.room?.map((room) => {
        const draft = draftMap[room._id];
        return (
          <Item
            draft={draft}
            active={room._id.toString() == id}
            key={room._id.toString()}
            data={room}
          />
        );
      })}
    </ul>
  );
};
