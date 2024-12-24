import { WrapItem } from "@chakra-ui/react";
import { Config } from "./config";
import { Loading } from "./Loading";
import classNames from "classnames";

export function Content() {
  const room = useAppSelector((state) => state.room.data);
  const userinfo = useAppSelector((state) => state.user.data);
  if (!room?.id) {
    return <Loading />;
  }
  let name = room.name;
  let image = room.image!;
  if (room.channelType === "PRIVATE") {
    const user = room.member?.find((u) => u.id !== userinfo.id);
    if (user) {
      name = user.username;
      image = user.image;
    }
  }
  return (
    <div className="flex items-center">
      <WrapItem>
        <AvatarComponent name={name} src={image} />
      </WrapItem>
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
      className={classNames(
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
