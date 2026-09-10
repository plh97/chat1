import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import type { IMediaMessage } from "@/interfaces";
import theme from "@/theme";
import { DocsMsg } from "./DocsMsg";

describe("DocsMsg", () => {
  it("fits a narrow bubble and exposes a safe attachment link", () => {
    const message = {
      name: "a-very-long-document-name-that-must-truncate.pdf",
      extension: "pdf",
      size: 2048,
      url: "https://example.com/document.pdf",
    } as IMediaMessage;
    const { container } = render(
      <ChakraProvider value={theme}>
        <DocsMsg message={message} />
      </ChakraProvider>
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card).toHaveClass("w-full", "min-w-0", "max-w-[300px]");
    expect(card).not.toHaveAttribute("style");
    expect(
      screen.getByRole("link", { name: `Open ${message.name}` })
    ).toHaveAttribute("href", message.url);
    expect(
      screen.getByRole("link", { name: `Open ${message.name}` })
    ).toHaveAttribute("target", "_blank");
    expect(
      screen.getByRole("link", { name: `Open ${message.name}` })
    ).toHaveAttribute("rel", "noopener noreferrer");
  });
});
