import { Config } from "./config";
import { Loading } from "./Loading";
import { getRoomDisplay } from "@/utils/roomDisplay";

export function Content() {
  const room = useAppSelector((state) => state.room.data);
  const userinfo = useAppSelector((state) => state.user.data);
  if (!room?.id) {
    return <Loading />;
  }
  const { name, image, profile } = getRoomDisplay(room, userinfo.id);
  return (
    <div className="flex items-center">
      <WithProfile profile={profile}>
        <Avatar name={name} src={image} />
      </WithProfile>
      <div className="ml-2">
        <p className="text-lg font-semibold">{name}</p>
        <p className="text-sm text-gray-400">Active now</p>
      </div>
    </div>
  );
}

export function Header({ className }: { readonly className?: string }) {
  return (
    <div
      className={clsx(
        "shadow-2xl z-10 bg-slate-800 flex items-center justify-between px-4 py-2 border-b",
        className
      )}
    >
      <div className="flex flex-1 items-center">
        <Content />
      </div>
      <Config />
    </div>
  );
}
