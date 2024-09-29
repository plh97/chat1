import { logoutThunk } from "@/store/reducer/user";
import { List } from "./List";
import { AddRoomDialog } from "./AddRoomDialog";
import { AddFriendDialog } from "./AddFriendDialog";

export function Sider() {
  const dispatch = useThunkDispatch();
  function handleLogout() {
    dispatch(logoutThunk());
  }
  return (
    <div className="bg-slate-800 border-r-2 border-slate-900 border-solid basis-72 max-md:hidden flex flex-col basis-72 flex-0">
      <div className="flex gap-3 items-center justify-center h-14">
        <AddFriendDialog />
        <AddRoomDialog />
      </div>
      <List />
      <div className="flex items-center justify-center h-14">
        <Button colorScheme="grey" variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
