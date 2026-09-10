import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { useAppSelector } from "@/hooks/app";
import theme from "@/theme";
import { Input } from "./input";

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/room/1" }),
}));

jest.mock("@/hooks/app", () => ({
  useAppSelector: jest.fn(),
}));

jest.mock("@/utils/uploadFile", () => ({
  getNormalizedMimeType: jest.fn(() => "text/plain"),
}));

const mockedUseAppSelector = useAppSelector as jest.Mock;

const setFinePointer = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === "(pointer: fine)" ? matches : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

const renderInput = (
  finePointer: boolean,
  props: Partial<React.ComponentProps<typeof Input>> = {}
) => {
  setFinePointer(finePointer);
  const inputProps: React.ComponentProps<typeof Input> = {
    handlePaste: jest.fn(),
    text: "",
    onChange: jest.fn(),
    handleSendMessage: jest.fn(),
    ...props,
  };
  const view = (nextProps = inputProps) => (
    <ChakraProvider value={theme}>
      <Input {...nextProps} />
    </ChakraProvider>
  );
  const rendered = render(view());
  return { ...rendered, inputProps, view };
};

describe("message input pointer behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAppSelector.mockReturnValue(undefined);
  });

  it("focuses automatically and sends Enter for a fine pointer", () => {
    const handleSendMessage = jest.fn();
    renderInput(true, { handleSendMessage });
    const textarea = screen.getByRole("textbox", { name: "Message" });

    expect(textarea).toHaveFocus();
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(enter);

    expect(enter.defaultPrevented).toBe(true);
    expect(handleSendMessage).toHaveBeenCalledTimes(1);
  });

  it("leaves Return available for a newline on a coarse pointer", () => {
    const handleSendMessage = jest.fn();
    renderInput(false, { handleSendMessage });
    const textarea = screen.getByRole("textbox", { name: "Message" });
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });

    textarea.dispatchEvent(enter);

    expect(textarea).not.toHaveFocus();
    expect(enter.defaultPrevented).toBe(false);
    expect(handleSendMessage).not.toHaveBeenCalled();
  });

  it("keeps Shift+Enter and composition Enter as text input", () => {
    const handleSendMessage = jest.fn();
    renderInput(true, { handleSendMessage });
    const textarea = screen.getByRole("textbox", { name: "Message" });
    const shiftEnter = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const composingEnter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, "isComposing", { value: true });

    textarea.dispatchEvent(shiftEnter);
    textarea.dispatchEvent(composingEnter);

    expect(shiftEnter.defaultPrevented).toBe(false);
    expect(composingEnter.defaultPrevented).toBe(false);
    expect(handleSendMessage).not.toHaveBeenCalled();
  });

  it("grows with content and caps the textarea at five lines", () => {
    let scrollHeight = 70;
    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "scrollHeight"
    );
    Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
      configurable: true,
      get: () => scrollHeight,
    });
    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    const computedStyle = jest
      .spyOn(window, "getComputedStyle")
      .mockImplementation((element) => {
        if (element instanceof HTMLTextAreaElement) {
          return {
            lineHeight: "20px",
            paddingTop: "8px",
            paddingBottom: "8px",
            borderTopWidth: "1px",
            borderBottomWidth: "1px",
          } as CSSStyleDeclaration;
        }
        return originalGetComputedStyle(element);
      });

    try {
      const { container, inputProps, rerender, view } = renderInput(false, {
        text: "one",
      });
      const textarea = container.querySelector("textarea")!;
      expect(textarea.style.height).toBe("72px");
      expect(textarea.style.overflowY).toBe("hidden");

      scrollHeight = 200;
      rerender(
        view({ ...inputProps, text: "one\ntwo\nthree\nfour\nfive\nsix" })
      );

      expect(textarea.style.height).toBe("118px");
      expect(textarea.style.overflowY).toBe("auto");
    } finally {
      computedStyle.mockRestore();
      if (originalScrollHeight) {
        Object.defineProperty(
          HTMLTextAreaElement.prototype,
          "scrollHeight",
          originalScrollHeight
        );
      } else {
        Reflect.deleteProperty(HTMLTextAreaElement.prototype, "scrollHeight");
      }
    }
  });
});
