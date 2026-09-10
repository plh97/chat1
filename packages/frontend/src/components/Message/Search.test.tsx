import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MessageSearch } from "./Search";

const mockDispatch = jest.fn();

jest.mock("@/Api", () => ({
  __esModule: true,
  default: {
    searchRoomMessages: jest.fn(),
  },
}));

jest.mock("@/store/reducer/room", () => ({
  openMessageWindowThunk: jest.fn(),
}));

jest.mock("./hook", () => ({
  focusMessage: jest.fn(),
}));

jest.mock("@/hooks/app", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ room: { data: { id: "7" } } }),
  useThunkDispatch: () => mockDispatch,
}));

describe("MessageSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("behaves like an app dialog and restores focus when dismissed", async () => {
    render(<MessageSearch />);

    const trigger = screen.getByRole("button", { name: "Search messages" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "Search messages",
    });
    expect(dialog).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByPlaceholderText("Search messages")).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes when the backdrop is pressed", async () => {
    render(<MessageSearch />);
    fireEvent.click(screen.getByRole("button", { name: "Search messages" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Dismiss message search" })
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Search messages" })
      ).not.toBeInTheDocument()
    );
  });
});
