export type CallMediaType = "audio" | "video";

export type CallSignalType =
  "offer" | "answer" | "ice-candidate" | "reject" | "hangup" | "busy";

export interface CallSignal {
  callId: string;
  roomId: string;
  fromUserId?: string;
  toUserId: string;
  type: CallSignalType;
  mediaType: CallMediaType;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export type CallPhase = "incoming" | "calling" | "connecting" | "active";

export interface CallSession {
  callId: string;
  roomId: string;
  peerId: string;
  peerName: string;
  peerImage: string;
  mediaType: CallMediaType;
  phase: CallPhase;
  direction: "incoming" | "outgoing";
}
