import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { CallOverlay } from "./CallOverlay";
import { CallSession } from "./types";

jest.mock("@/components/Avatar", () => ({
  Avatar: ({ name }: { name: string }) => <div>{name}</div>,
}));

const incomingSession: CallSession = {
  callId: "call-1",
  roomId: "4",
  peerId: "2",
  peerName: "dev",
  peerImage: "",
  mediaType: "video",
  phase: "incoming",
  direction: "incoming",
};

const createProps = () => ({
  session: incomingSession,
  localStream: null,
  remoteStream: null,
  error: "",
  microphoneEnabled: true,
  cameraEnabled: true,
  screenSharing: false,
  onAccept: jest.fn(),
  onReject: jest.fn(),
  onHangup: jest.fn(),
  onToggleMicrophone: jest.fn(),
  onToggleCamera: jest.fn(),
  onToggleScreenShare: jest.fn(),
  onDismissError: jest.fn(),
});

describe("CallOverlay", () => {
  it("allows an incoming video call to be accepted or rejected", () => {
    const props = createProps();
    render(<CallOverlay {...props} />);

    expect(screen.getByText("邀请你视频通话")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "接听通话" }));
    fireEvent.click(screen.getByRole("button", { name: "拒绝通话" }));

    expect(props.onAccept).toHaveBeenCalledTimes(1);
    expect(props.onReject).toHaveBeenCalledTimes(1);
  });

  it("shows microphone, camera and hangup controls during a video call", () => {
    const props = createProps();
    props.session = {
      ...incomingSession,
      phase: "active",
      direction: "outgoing",
    };
    render(<CallOverlay {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "静音" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭摄像头" }));
    fireEvent.click(screen.getByRole("button", { name: "共享屏幕" }));
    fireEvent.click(screen.getByRole("button", { name: "挂断通话" }));

    expect(props.onToggleMicrophone).toHaveBeenCalledTimes(1);
    expect(props.onToggleCamera).toHaveBeenCalledTimes(1);
    expect(props.onToggleScreenShare).toHaveBeenCalledTimes(1);
    expect(props.onHangup).toHaveBeenCalledTimes(1);
  });
});
