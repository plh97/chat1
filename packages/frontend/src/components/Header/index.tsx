import { WrapItem } from "@chakra-ui/react";
import { Config } from "./config";
import { Loading } from "./Loading";

export function Content() {
  const { id = "" } = useParams();
  const room = useAppSelector((state) => state.user.data.room);
  const currentRoom = room?.find((item) => item.id === id);
  if (!currentRoom) {
    return <Loading />;
  }
  return (
    <div className="flex items-center">
      <WrapItem>
        <AvatarComponnet
          name={currentRoom.image ? undefined : currentRoom.name}
          src={currentRoom.image ?? ''}
        />
      </WrapItem>
      <div className="ml-2">
        <p className="text-lg font-semibold">{currentRoom.name}</p>
        <p className="text-sm text-gray-400">Active now</p>
      </div>
    </div>
  );
}

export function Header() {
  return (
    <div className="shadow-2xl z-10 bg-slate-800 flex items-center justify-between px-4 py-2 border-b">
      <div className="flex flex-1 items-center">
        <Content />
      </div>
      <Config />
    </div>
  );
}
