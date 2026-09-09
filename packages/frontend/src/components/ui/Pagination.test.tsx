import React from "react";
import { render, screen } from "@testing-library/react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { AppPagination } from "./Pagination";

describe("AppPagination", () => {
  const renderWithProvider = (children: React.ReactNode) =>
    render(<ChakraProvider value={defaultSystem}>{children}</ChakraProvider>);

  it("renders the accessible Chakra pagination controls", () => {
    const onPageChange = jest.fn();

    renderWithProvider(
      <AppPagination
        count={20}
        page={2}
        pageSize={6}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("does not render when all results fit on one page", () => {
    const { container } = renderWithProvider(
      <AppPagination
        count={6}
        page={1}
        pageSize={6}
        onPageChange={() => undefined}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
