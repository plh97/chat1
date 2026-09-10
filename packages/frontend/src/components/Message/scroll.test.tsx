import React from "react";
import { render, screen } from "@testing-library/react";
import { useAppSelector } from "@/hooks/app";
import { shouldCenterMessageLoader, Top } from "./scroll";

jest.mock("@/hooks/app", () => ({
  useAppSelector: jest.fn(),
  useThunkDispatch: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useParams: jest.fn(() => ({ id: "room-1" })),
}));

jest.mock("@/store/reducer/room", () => ({
  getRoomInfoThunk: jest.fn(),
  initialMessage: jest.fn(),
  scrollToEnd: jest.fn(),
}));

jest.mock("./hook", () => ({
  useLoadMore: jest.fn(),
  useScroll: jest.fn(),
}));

jest.mock("virtua", () => ({
  VList: () => null,
}));

const mockedUseAppSelector = useAppSelector as jest.Mock;

describe("message loading placement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps initial loading centered after room metadata arrives", () => {
    expect(
      shouldCenterMessageLoader({
        roomId: undefined,
        userId: "user-1",
        messageCount: 0,
        loadingMessageKind: "initial",
      })
    ).toBe(true);
    expect(
      shouldCenterMessageLoader({
        roomId: "room-1",
        userId: "user-1",
        messageCount: 0,
        loadingMessageKind: "initial",
      })
    ).toBe(true);
    expect(
      shouldCenterMessageLoader({
        roomId: "room-1",
        userId: "user-1",
        messageCount: 0,
        loadingMessageKind: "before",
      })
    ).toBe(false);
    expect(
      shouldCenterMessageLoader({
        roomId: "room-1",
        userId: "user-1",
        messageCount: 20,
        loadingMessageKind: "initial",
      })
    ).toBe(false);
  });

  it("reserves one fixed top row only for loading earlier messages", () => {
    let roomState = {
      loadingMessageKind: "before",
      data: { hasMoreMessage: true },
    };
    mockedUseAppSelector.mockImplementation((selector) =>
      selector({ room: roomState })
    );

    const { container, rerender } = render(<Top />);
    const row = container.firstElementChild;
    expect(row).toHaveClass("h-12");
    expect(
      screen.getByRole("status", { name: "Loading earlier messages" })
    ).toBeInTheDocument();

    roomState = {
      loadingMessageKind: "window",
      data: { hasMoreMessage: true },
    };
    rerender(<Top />);
    expect(
      screen.queryByRole("status", { name: "Loading earlier messages" })
    ).not.toBeInTheDocument();
    expect(container.firstElementChild).toBe(row);
    expect(row).toHaveClass("h-12");
  });
});
