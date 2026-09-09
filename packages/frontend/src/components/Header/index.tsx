import { Config } from "./config";
import { Loading } from "./Loading";
import { getPrivateRoomPeer, getRoomDisplay } from "@/utils/roomDisplay";
import { MessageSearch } from "@/components/Message/Search";
import { useCall } from "@/components/Call";
import { Phone, Video } from "lucide-react";

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
  const room = useAppSelector((state) => state.room.data);
  const userinfo = useAppSelector((state) => state.user.data);
  const { session, startCall } = useCall();
  const peer = getPrivateRoomPeer(room, userinfo.id);

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
      <div className="flex items-center gap-1">
        {room.channelType === "PRIVATE" && peer ? (
          <>
            <button
              type="button"
              aria-label="发起语音通话"
              title="语音通话"
              disabled={Boolean(session)}
              onClick={() =>
                startCall({
                  roomId: String(room.id),
                  peer,
                  mediaType: "audio",
                })
              }
              className="flex h-10 w-10 items-center justify-center rounded-md text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Phone className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="发起视频通话"
              title="视频通话"
              disabled={Boolean(session)}
              onClick={() =>
                startCall({
                  roomId: String(room.id),
                  peer,
                  mediaType: "video",
                })
              }
              className="flex h-10 w-10 items-center justify-center rounded-md text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Video className="h-5 w-5" />
            </button>
          </>
        ) : null}
        <MessageSearch />
        <Config />
      </div>
    </div>
  );
}
