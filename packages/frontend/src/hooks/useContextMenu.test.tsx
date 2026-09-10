import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useContextMenu } from "./useContextMenu";

function ContextMenuTarget({
  onOpen,
}: {
  onOpen: (position: { clientX: number; clientY: number }) => void;
}) {
  const handlers = useContextMenu(onOpen);
  return (
    <div data-testid="target" {...handlers}>
      Selectable message
    </div>
  );
}

describe("useContextMenu", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("opens once after a 500ms touch hold and suppresses its contextmenu", () => {
    const onOpen = jest.fn();
    render(<ContextMenuTarget onOpen={onOpen} />);
    const target = screen.getByTestId("target");

    fireEvent.touchStart(target, {
      touches: [{ clientX: 24, clientY: 36 }],
    });
    act(() => jest.advanceTimersByTime(499));
    expect(onOpen).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith({ clientX: 24, clientY: 36 });

    const contextMenu = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 24,
      clientY: 36,
    });
    target.dispatchEvent(contextMenu);

    expect(contextMenu.defaultPrevented).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it.each(["touchMove", "touchEnd", "touchCancel"] as const)(
    "cancels a pending hold on %s",
    (eventName) => {
      const onOpen = jest.fn();
      render(<ContextMenuTarget onOpen={onOpen} />);
      const target = screen.getByTestId("target");

      fireEvent.touchStart(target, {
        touches: [{ clientX: 10, clientY: 20 }],
      });
      fireEvent[eventName](target);
      act(() => jest.advanceTimersByTime(500));

      expect(onOpen).not.toHaveBeenCalled();
    }
  );

  it("keeps desktop contextmenu support without a second callback", () => {
    const onOpen = jest.fn();
    render(<ContextMenuTarget onOpen={onOpen} />);
    const target = screen.getByTestId("target");
    const contextMenu = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 42,
      clientY: 64,
    });

    target.dispatchEvent(contextMenu);

    expect(contextMenu.defaultPrevented).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith({ clientX: 42, clientY: 64 });
  });
});
