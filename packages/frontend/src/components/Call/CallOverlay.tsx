import { Avatar } from "@/components/Avatar";
import clsx from "clsx";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { CallSession } from "./types";

interface CallOverlayProps {
  session: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string;
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onDismissError: () => void;
}

const statusText = (session: CallSession) => {
  if (session.phase === "incoming") {
    return session.mediaType === "video" ? "邀请你视频通话" : "邀请你语音通话";
  }
  if (session.phase === "calling") return "正在呼叫…";
  if (session.phase === "connecting") return "正在连接…";
  return "通话中";
};

const MediaElement = ({
  stream,
  muted = false,
  className,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video ref={ref} autoPlay playsInline muted={muted} className={className} />
  );
};

const RemoteAudio = ({ stream }: { stream: MediaStream | null }) => {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
};

export function CallOverlay({
  session,
  localStream,
  remoteStream,
  error,
  microphoneEnabled,
  cameraEnabled,
  screenSharing,
  onAccept,
  onReject,
  onHangup,
  onToggleMicrophone,
  onToggleCamera,
  onToggleScreenShare,
  onDismissError,
}: Readonly<CallOverlayProps>) {
  if (!session) {
    return error ? (
      <div
        role="alert"
        className="fixed right-4 top-4 z-[110] flex max-w-sm items-center gap-3 rounded-lg border border-red-400/40 bg-slate-900 px-4 py-3 text-sm text-red-200 shadow-2xl"
      >
        <span>{error}</span>
        <button
          type="button"
          aria-label="关闭通话提示"
          onClick={onDismissError}
          className="rounded p-1 hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : null;
  }

  if (session.phase === "incoming") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={`${session.peerName} 的通话邀请`}
          className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-800 p-7 text-center text-white shadow-2xl"
        >
          <Avatar
            name={session.peerName}
            src={session.peerImage}
            className="mx-auto h-24 w-24 text-2xl"
          />
          <h2 className="mt-5 text-xl font-semibold">{session.peerName}</h2>
          <p className="mt-2 text-sm text-slate-300">{statusText(session)}</p>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          <div className="mt-8 flex justify-center gap-12">
            <div className="text-center">
              <button
                type="button"
                aria-label="拒绝通话"
                onClick={onReject}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-400"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
              <span className="mt-2 block text-xs text-slate-300">拒绝</span>
            </div>
            <div className="text-center">
              <button
                type="button"
                aria-label="接听通话"
                onClick={onAccept}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-400"
              >
                {session.mediaType === "video" ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </button>
              <span className="mt-2 block text-xs text-slate-300">接听</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-3 text-white">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`与 ${session.peerName} 通话`}
        className="relative flex h-full max-h-[52rem] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-5 text-center">
          <h2 className="text-xl font-semibold">{session.peerName}</h2>
          <p className="mt-1 text-sm text-slate-300">{statusText(session)}</p>
          {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-950">
          {session.mediaType === "video" ? (
            <>
              {remoteStream ? (
                <MediaElement
                  stream={remoteStream}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Avatar
                  name={session.peerName}
                  src={session.peerImage}
                  className="h-28 w-28 text-3xl"
                />
              )}
              {localStream ? (
                <MediaElement
                  stream={localStream}
                  muted
                  className={clsx(
                    "absolute bottom-5 right-5 rounded-xl border border-white/30 bg-black shadow-xl",
                    screenSharing
                      ? "h-28 w-52 object-contain sm:h-40 sm:w-72"
                      : "h-36 w-28 object-cover sm:h-48 sm:w-36"
                  )}
                />
              ) : null}
            </>
          ) : (
            <div className="text-center">
              <Avatar
                name={session.peerName}
                src={session.peerImage}
                className="mx-auto h-32 w-32 text-4xl"
              />
              <p className="mt-5 text-lg text-slate-300">
                {statusText(session)}
              </p>
              <RemoteAudio stream={remoteStream} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-5 border-t border-slate-800 bg-slate-900 p-5">
          <button
            type="button"
            aria-label={microphoneEnabled ? "静音" : "取消静音"}
            title={microphoneEnabled ? "静音" : "取消静音"}
            onClick={onToggleMicrophone}
            className={clsx(
              "flex h-12 w-12 items-center justify-center rounded-full transition",
              microphoneEnabled
                ? "bg-slate-700 hover:bg-slate-600"
                : "bg-white text-slate-900"
            )}
          >
            {microphoneEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </button>
          {session.mediaType === "video" ? (
            <>
              <button
                type="button"
                aria-label={screenSharing ? "停止共享屏幕" : "共享屏幕"}
                title={screenSharing ? "停止共享屏幕" : "共享屏幕"}
                onClick={onToggleScreenShare}
                className={clsx(
                  "flex h-12 w-12 items-center justify-center rounded-full transition",
                  screenSharing
                    ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    : "bg-slate-700 hover:bg-slate-600"
                )}
              >
                {screenSharing ? (
                  <ScreenShareOff className="h-5 w-5" />
                ) : (
                  <ScreenShare className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                aria-label={cameraEnabled ? "关闭摄像头" : "打开摄像头"}
                title={
                  screenSharing
                    ? "共享屏幕时不能切换摄像头"
                    : cameraEnabled
                      ? "关闭摄像头"
                      : "打开摄像头"
                }
                disabled={screenSharing}
                onClick={onToggleCamera}
                className={clsx(
                  "flex h-12 w-12 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40",
                  cameraEnabled
                    ? "bg-slate-700 hover:bg-slate-600"
                    : "bg-white text-slate-900"
                )}
              >
                {cameraEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </button>
            </>
          ) : null}
          <button
            type="button"
            aria-label="挂断通话"
            title="挂断"
            onClick={onHangup}
            className="flex h-12 w-16 items-center justify-center rounded-full bg-red-500 hover:bg-red-400"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </section>
    </div>
  );
}
