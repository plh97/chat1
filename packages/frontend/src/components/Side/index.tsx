import { PropsWithChildren } from "react";
import { IconButton } from "@chakra-ui/react";
import { FaBars } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";
import DropdownMenu from "@/components/Side/DropdownMenu";
import { logoutThunk } from "@/store/reducer/user";
import { List } from "./List";

const ActionMenu = () => {
  return <DropdownMenu />;
};

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
      className={clsx(
        "bg-slate-800 border-r-2 border-slate-900 border-solid basis-72 flex min-h-0 flex-col basis-72 flex-0 overflow-hidden",
        className
      )}
    >
      <div className="flex h-14 flex-none items-center justify-start gap-3 px-2">
        <ActionMenu />
      </div>
      <List />
      <div className="flex h-14 flex-none items-center justify-center">
        <Button color="gray" variant="outline" onClick={handleLogout}>
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
        className={clsx(
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
          icon={open ? <FaXmark /> : <FaBars />}
        />
      </span>
      <div
        className={clsx("hidden w-48 h-[100vh] fixed top-0 z-20", {
          "max-md:!flex": open,
        })}
      >
        <SideComponent className="z-20 px-2" />
        <button
          className="w-[100vw] h-[100vh] fixed top-0 bg-black/80"
          onClick={() => setOpen(false)}
        />
      </div>
    </>
  );
}
