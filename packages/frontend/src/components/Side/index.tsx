import { logoutThunk } from "@/store/reducer/user";
import { List } from "./List";
import { AddRoomDialog } from "./AddRoomDialog";
import { AddFriendDialog } from "./AddFriendDialog";
import classNames from "classnames";
import { IconButton } from "@chakra-ui/react";
import { FaBars, FaPlus } from "react-icons/fa";
import { PropsWithChildren } from "react";

export function SideComponent({
  className,
}: PropsWithChildren<{ className?: string }>) {
  const dispatch = useThunkDispatch();
  function handleLogout() {
    dispatch(logoutThunk());
  }
  return (
    <div
      data-side
      className={classnames(
        "bg-slate-800 border-r-2 border-slate-900 border-solid basis-72 flex flex-col basis-72 flex-0",
        className
      )}
    >
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

export function Side() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SideComponent className="max-md:hidden" />
      <span
        className={classNames(
          "absolute top-16 md:!hidden inline-block fixed icon text-2xl z-30 p-2",
          {
            "text-white": open,
          }
        )}
      >
        <IconButton
          background={open ? "gray.600" : "gray.800"}
          aria-label="Toggle Sidebar"
          onClick={() => {
            setOpen(!open);
          }}
          isRound
          icon={open ? <FaPlus /> : <FaBars />}
        />
      </span>
      <div
        className={classNames("hidden w-48 h-[100vh] fixed top-0 z-20", {
          "max-md:!flex": open,
        })}
      >
        <SideComponent className="z-20 px-2" />
        <div
          className="w-[100vw] h-[100vh] fixed top-0 bg-black/80"
          onClick={() => setOpen(false)}
        />
      </div>
    </>
  );
}
