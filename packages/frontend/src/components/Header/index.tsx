import { Config } from "./config";
import { Loading } from "./Loading";
import { getPrivateRoomPeer, getRoomDisplay } from "@/utils/roomDisplay";
import { MessageSearch } from "@/components/Message/Search";
import { useCall } from "@/components/Call";
import { ArrowLeft, Phone, Video } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export function Content() {
  const room = useAppSelector((state) => state.room.data);
  const userinfo = useAppSelector((state) => state.user.data);
  if (!room?.id) {
    return <Loading />;
  }
  const { name, image, profile } = getRoomDisplay(room, userinfo.id);
  return (
    <div className="flex min-w-0 flex-1 items-center">
      <WithProfile profile={profile}>
        <Avatar name={name} src={image} />
      </WithProfile>
      <div className="ml-2 min-w-0 flex-1">
        <p className="truncate text-lg font-semibold">{name}</p>
        <p className="truncate text-sm text-gray-400">Active now</p>
      </div>
    </div>
  );
}

export function Header({ className }: { readonly className?: string }) {
  const room = useAppSelector((state) => state.room.data);
  const userinfo = useAppSelector((state) => state.user.data);
  const { session, startCall } = useCall();
  const peer = getPrivateRoomPeer(room, userinfo.id);
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromChats = Boolean(
    (location.state as { fromChats?: boolean } | null)?.fromChats
  );
  const handleBackToChats = () => {
    if (cameFromChats) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <header
      className={clsx(
        "shadow-2xl z-10 bg-slate-800 flex min-w-0 flex-none items-center justify-between px-4 py-2 border-b",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center">
        <button
          type="button"
          aria-label="Back to chats"
          onClick={handleBackToChats}
          className="mr-1 flex min-h-11 shrink-0 items-center rounded-md pr-2 text-slate-200 transition-colors hover:bg-slate-700 active:bg-slate-600 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-medium">Chats</span>
        </button>
        <Content />
      </div>
      <div className="flex shrink-0 items-center gap-1">
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
              className="flex h-10 w-10 items-center justify-center rounded-md text-slate-200 transition-colors hover:bg-slate-700 active:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="flex h-10 w-10 items-center justify-center rounded-md text-slate-200 transition-colors hover:bg-slate-700 active:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Video className="h-5 w-5" />
            </button>
          </>
        ) : null}
        <MessageSearch />
        <Config />
      </div>
    </header>
  );
}
