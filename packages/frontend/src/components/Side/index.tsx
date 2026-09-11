import { useMatch } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import DropdownMenu from "@/components/Side/DropdownMenu";
import { logoutThunk } from "@/store/reducer/user";
import { List } from "./List";

const ActionMenu = () => {
  return <DropdownMenu />;
};

export function SideComponent({ className }: { readonly className?: string }) {
  const dispatch = useThunkDispatch();
  function handleLogout() {
    dispatch(logoutThunk());
  }
  return (
    <aside
      aria-label="Chats"
      data-side
      className={clsx(
        "w-full shrink-0 bg-slate-800 flex min-h-0 flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:w-72 md:basis-72 md:border-r-2 md:border-slate-900 md:border-solid md:py-0",
        className
      )}
    >
      <div className="flex h-14 flex-none items-center gap-3 px-4 md:px-2">
        <BrandLogo className="h-8" />
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">Chats</h1>
        <ActionMenu />
      </div>
      <List />
      <div className="flex min-h-14 flex-none items-center justify-center px-4">
        <Button
          color="gray"
          variant="outline"
          onClick={handleLogout}
          className="active:bg-slate-700"
        >
          Logout
        </Button>
      </div>
    </aside>
  );
}

export function Side() {
  const isRoomRoute = Boolean(useMatch("/room/:id"));
  return <SideComponent className={clsx({ "max-md:hidden": isRoomRoute })} />;
}
