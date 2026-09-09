import { IWsData, WS_EVENT } from "@/core";
import { useAppSelector } from "@/hooks/app";
import { useEventListener } from "@/hooks/useEventListener";
import { ws } from "@/hooks/useWebsocket";
import { IRoom, IUser } from "@/interfaces";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CallOverlay } from "./CallOverlay";
import { CallMediaType, CallSession, CallSignal } from "./types";

interface StartCallOptions {
  roomId: string;
  peer: IUser;
  mediaType: CallMediaType;
}

interface CallContextValue {
  session: CallSession | null;
  startCall: (options: StartCallOptions) => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

const callId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `call-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const iceServers = (): RTCIceServer[] => {
  const configured = String(import.meta.env.VITE_WEBRTC_STUN_URL ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  return [
    {
      urls: configured.length ? configured : ["stun:stun.l.google.com:19302"],
    },
  ];
};

const mediaErrorMessage = (error: unknown) => {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "没有麦克风或摄像头权限";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "未找到可用的麦克风或摄像头";
  }
  return error instanceof Error ? error.message : "无法建立通话";
};

const findPeer = (rooms: IRoom[] | null, roomId: string, peerId: string) => {
  const room = rooms?.find((item) => String(item.id) === roomId);
  if (!room) return undefined;
  if (room.peer && String(room.peer.id) === peerId) return room.peer;
  return [...(room.member ?? []), ...(room.admin ?? []), room.creator].find(
    (user) => user && String(user.id) === peerId
  );
};

export function CallProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const currentUser = useAppSelector((state) => state.user.data);
  const [session, setSession] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const sessionRef = useRef<CallSession | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingOfferRef = useRef<CallSignal | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timeoutRef = useRef<number | undefined>(undefined);

  const updateSession = useCallback((next: CallSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const sendSignal = useCallback((signal: CallSignal) => {
    if (!ws?.socket || ws.socket.readyState !== WebSocket.OPEN) {
      throw new Error("连接已断开，请稍后重试");
    }
    ws.sendMsg(signal, WS_EVENT.CALL_SIGNAL);
  }, []);

  const clearCall = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMicrophoneEnabled(true);
    setCameraEnabled(true);
    updateSession(null);
  }, [updateSession]);

  const endCall = useCallback(() => {
    const activeSession = sessionRef.current;
    if (activeSession) {
      try {
        sendSignal({
          callId: activeSession.callId,
          roomId: activeSession.roomId,
          toUserId: activeSession.peerId,
          type: "hangup",
          mediaType: activeSession.mediaType,
        });
      } catch {
        // Local media must still stop when signaling is unavailable.
      }
    }
    clearCall();
  }, [clearCall, sendSignal]);

  const createPeerConnection = useCallback(
    (activeSession: CallSession) => {
      peerConnectionRef.current?.close();
      const connection = new RTCPeerConnection({ iceServers: iceServers() });
      peerConnectionRef.current = connection;
      connection.onicecandidate = ({ candidate }) => {
        if (!candidate || sessionRef.current?.callId !== activeSession.callId)
          return;
        try {
          sendSignal({
            callId: activeSession.callId,
            roomId: activeSession.roomId,
            toUserId: activeSession.peerId,
            type: "ice-candidate",
            mediaType: activeSession.mediaType,
            candidate: candidate.toJSON(),
          });
        } catch (signalError) {
          setError(mediaErrorMessage(signalError));
        }
      };
      connection.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        setRemoteStream(stream);
      };
      connection.onconnectionstatechange = () => {
        if (sessionRef.current?.callId !== activeSession.callId) return;
        if (connection.connectionState === "connected") {
          updateSession({ ...sessionRef.current, phase: "active" });
          setError("");
        } else if (connection.connectionState === "failed") {
          setError("通话连接失败");
          clearCall();
        }
      };
      return connection;
    },
    [clearCall, sendSignal, updateSession]
  );

  const openLocalMedia = useCallback(async (mediaType: CallMediaType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mediaType === "video",
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setMicrophoneEnabled(true);
    setCameraEnabled(mediaType === "video");
    return stream;
  }, []);

  const startCall = useCallback(
    async ({ roomId, peer, mediaType }: StartCallOptions) => {
      if (sessionRef.current) return;
      setError("");
      const nextSession: CallSession = {
        callId: callId(),
        roomId,
        peerId: String(peer.id),
        peerName: peer.userName,
        peerImage: peer.image,
        mediaType,
        phase: "calling",
        direction: "outgoing",
      };
      updateSession(nextSession);
      try {
        const stream = await openLocalMedia(mediaType);
        const connection = createPeerConnection(nextSession);
        stream
          .getTracks()
          .forEach((track) => connection.addTrack(track, stream));
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        sendSignal({
          callId: nextSession.callId,
          roomId,
          toUserId: nextSession.peerId,
          type: "offer",
          mediaType,
          sdp: offer,
        });
        timeoutRef.current = window.setTimeout(() => {
          if (
            sessionRef.current?.callId === nextSession.callId &&
            sessionRef.current.phase === "calling"
          ) {
            endCall();
            setError("对方暂时无人接听");
          }
        }, 45_000);
      } catch (callError) {
        clearCall();
        setError(mediaErrorMessage(callError));
      }
    },
    [
      clearCall,
      createPeerConnection,
      endCall,
      openLocalMedia,
      sendSignal,
      updateSession,
    ]
  );

  const acceptCall = useCallback(async () => {
    const offerSignal = pendingOfferRef.current;
    const activeSession = sessionRef.current;
    if (!offerSignal?.sdp || !activeSession) return;
    setError("");
    const connectingSession = {
      ...activeSession,
      phase: "connecting" as const,
    };
    updateSession(connectingSession);
    try {
      const stream = await openLocalMedia(activeSession.mediaType);
      const connection = createPeerConnection(connectingSession);
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      await connection.setRemoteDescription(offerSignal.sdp);
      for (const candidate of pendingCandidatesRef.current) {
        await connection.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current = [];
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      sendSignal({
        callId: activeSession.callId,
        roomId: activeSession.roomId,
        toUserId: activeSession.peerId,
        type: "answer",
        mediaType: activeSession.mediaType,
        sdp: answer,
      });
    } catch (callError) {
      try {
        sendSignal({
          callId: activeSession.callId,
          roomId: activeSession.roomId,
          toUserId: activeSession.peerId,
          type: "reject",
          mediaType: activeSession.mediaType,
        });
      } catch {
        // The local error is more useful than a secondary signaling error.
      }
      clearCall();
      setError(mediaErrorMessage(callError));
    }
  }, [
    clearCall,
    createPeerConnection,
    openLocalMedia,
    sendSignal,
    updateSession,
  ]);

  const rejectCall = useCallback(() => {
    const activeSession = sessionRef.current;
    if (activeSession) {
      try {
        sendSignal({
          callId: activeSession.callId,
          roomId: activeSession.roomId,
          toUserId: activeSession.peerId,
          type: "reject",
          mediaType: activeSession.mediaType,
        });
      } catch {
        // Closing the incoming prompt does not depend on signaling succeeding.
      }
    }
    clearCall();
  }, [clearCall, sendSignal]);

  const onCallSignal = useCallback(
    async (envelope?: IWsData<CallSignal>) => {
      if (envelope && envelope.code !== 0) {
        clearCall();
        setError(envelope.message || "通话信令发送失败");
        return;
      }
      const signal = envelope?.data;
      if (!signal?.callId || !signal.fromUserId) return;
      const activeSession = sessionRef.current;
      if (signal.type === "offer") {
        if (activeSession && activeSession.callId !== signal.callId) {
          try {
            sendSignal({
              callId: signal.callId,
              roomId: String(signal.roomId),
              toUserId: String(signal.fromUserId),
              type: "busy",
              mediaType: signal.mediaType,
            });
          } catch {
            // The caller will time out if the busy response cannot be sent.
          }
          return;
        }
        if (activeSession) return;
        const peer = findPeer(
          currentUser.room,
          String(signal.roomId),
          String(signal.fromUserId)
        );
        pendingOfferRef.current = signal;
        updateSession({
          callId: signal.callId,
          roomId: String(signal.roomId),
          peerId: String(signal.fromUserId),
          peerName: peer?.userName ?? "联系人",
          peerImage: peer?.image ?? "",
          mediaType: signal.mediaType,
          phase: "incoming",
          direction: "incoming",
        });
        return;
      }
      if (!activeSession || activeSession.callId !== signal.callId) return;

      try {
        if (signal.type === "answer" && signal.sdp) {
          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
          timeoutRef.current = undefined;
          await peerConnectionRef.current?.setRemoteDescription(signal.sdp);
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnectionRef.current?.addIceCandidate(candidate);
          }
          pendingCandidatesRef.current = [];
          updateSession({ ...activeSession, phase: "connecting" });
        } else if (signal.type === "ice-candidate" && signal.candidate) {
          const connection = peerConnectionRef.current;
          if (connection?.remoteDescription) {
            await connection.addIceCandidate(signal.candidate);
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        } else if (
          signal.type === "reject" ||
          signal.type === "busy" ||
          signal.type === "hangup"
        ) {
          clearCall();
          if (signal.type === "reject") setError("对方已拒绝通话");
          if (signal.type === "busy") setError("对方正在通话中");
        }
      } catch (signalError) {
        clearCall();
        setError(mediaErrorMessage(signalError));
      }
    },
    [clearCall, currentUser.room, sendSignal, updateSession]
  );

  useEventListener(WS_EVENT.CALL_SIGNAL, onCallSignal);
  useEventListener(WS_EVENT.DISCONNECT, clearCall);

  useEffect(
    () => () => {
      const activeSession = sessionRef.current;
      if (activeSession) {
        try {
          sendSignal({
            callId: activeSession.callId,
            roomId: activeSession.roomId,
            toUserId: activeSession.peerId,
            type: "hangup",
            mediaType: activeSession.mediaType,
          });
        } catch {
          // Route changes must always release camera and microphone tracks.
        }
      }
      clearCall();
    },
    [clearCall, sendSignal]
  );

  const toggleMicrophone = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicrophoneEnabled(track.enabled);
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  };

  return (
    <CallContext.Provider value={{ session, startCall }}>
      {children}
      <CallOverlay
        session={session}
        localStream={localStream}
        remoteStream={remoteStream}
        error={error}
        microphoneEnabled={microphoneEnabled}
        cameraEnabled={cameraEnabled}
        onAccept={acceptCall}
        onReject={rejectCall}
        onHangup={endCall}
        onToggleMicrophone={toggleMicrophone}
        onToggleCamera={toggleCamera}
        onDismissError={() => setError("")}
      />
    </CallContext.Provider>
  );
}

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used inside CallProvider");
  return context;
};
