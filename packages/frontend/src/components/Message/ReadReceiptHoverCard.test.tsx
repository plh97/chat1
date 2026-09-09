import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import theme from "@/theme";
import type { IMessage, IRoom } from "@/interfaces";
import { ReadReceiptHoverCard } from "./ReadReceiptHoverCard";

jest.mock("@/utils/messageReaders", () => ({
  loadMessageReaders: jest.fn(),
}));

describe("ReadReceiptHoverCard", () => {
  it("opens the reader summary from an accessible hover target", async () => {
    render(
      <ChakraProvider value={theme}>
        <ReadReceiptHoverCard
          message={{ id: "10", seq: 10, userId: "1" } as IMessage}
          room={{ id: "4", member: [], admin: [], readSeq: {} } as IRoom}
          readCount={0}
          recipientCount={2}
        >
          <span>status</span>
        </ReadReceiptHoverCard>
      </ChakraProvider>
    );

    const trigger = screen.getByRole("button", {
      name: "查看已读用户，0/2 人已读",
    });
    fireEvent.pointerEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("Read by 0/2")).toBeInTheDocument();
    });
  });
});
