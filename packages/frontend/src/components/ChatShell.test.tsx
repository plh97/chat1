import React from "react";
import { render, screen } from "@testing-library/react";
import { ChatShell } from "./ChatShell";

const mockUseAuth = jest.fn();
const mockUseWebsocket = jest.fn();
let mockCallProviderMounts = 0;
let mockRoomId = "";

jest.mock("react-router-dom", () => ({
  Outlet: () => <div>{mockRoomId ? "Room one" : "Chat list"}</div>,
  useMatch: () => (mockRoomId ? { params: { id: mockRoomId } } : null),
}));

jest.mock("@/hooks/useAuth", () => ({
  __esModule: true,
  default: () => mockUseAuth(),
}));

jest.mock("@/hooks/useWebsocket", () => ({
  __esModule: true,
  default: (roomId: string) => mockUseWebsocket(roomId),
}));

jest.mock("@/components/Call", () => ({
  CallProvider: ({ children }: React.PropsWithChildren) => {
    const [instanceId] = React.useState(() => {
      mockCallProviderMounts += 1;
      return String(mockCallProviderMounts);
    });
    return (
      <div data-testid="call-provider" data-instance={instanceId}>
        {children}
      </div>
    );
  },
}));

jest.mock("./Layout", () => ({
  Layout: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe("ChatShell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallProviderMounts = 0;
    mockRoomId = "";
  });

  it("keeps its call provider mounted while passing the active room to websocket hooks", () => {
    const view = render(<ChatShell />);

    const provider = screen.getByTestId("call-provider");
    expect(provider).toHaveAttribute("data-instance", "1");
    expect(mockUseWebsocket).toHaveBeenLastCalledWith("");

    mockRoomId = "room-1";
    view.rerender(<ChatShell />);

    expect(screen.getByText("Room one")).toBeInTheDocument();
    expect(mockUseWebsocket).toHaveBeenLastCalledWith("room-1");
    expect(screen.getByTestId("call-provider")).toHaveAttribute(
      "data-instance",
      "1"
    );
    expect(mockCallProviderMounts).toBe(1);
  });
});
