import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Api from "@/Api";
import theme from "@/theme";
import type { IUser } from "@/interfaces";
import { RoomPeopleDialog } from "./RoomPeopleDialog";

jest.mock("@/Api", () => ({
  __esModule: true,
  default: {
    getRoomUsers: jest.fn(),
  },
}));

jest.mock("@/components/Avatar", () => ({
  Avatar: ({ name }: { name: string }) => <span>{name}</span>,
}));

jest.mock("@/components/WithProfile", () => ({
  WithProfile: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const admin = {
  id: "9",
  userName: "Ada",
  image: "",
} as IUser;
const creator = {
  id: "1",
  userName: "Owner",
  image: "",
} as IUser;

describe("RoomPeopleDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Api.getRoomUsers as jest.Mock).mockResolvedValue({
      users: [creator, admin],
      totalCount: 10,
    });
  });

  it("loads every role page and exposes confirmed actions for its users", async () => {
    const onAction = jest.fn();
    render(
      <ChakraProvider value={theme}>
        <RoomPeopleDialog
          roomId="7"
          role="admin"
          creatorId="1"
          currentUserId="7"
          initialTotalCount={9}
          canManage
          canTransferOwnership
          refreshVersion={0}
          onAction={onAction}
        />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage admins" }));

    await waitFor(() => {
      expect(Api.getRoomUsers).toHaveBeenCalledWith({
        id: "7",
        role: "admin",
        pageSize: 9,
        start: 0,
      });
    });
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Revoke admin from Owner" })
    ).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Transfer ownership to Ada",
      })
    );

    expect(onAction).toHaveBeenNthCalledWith(1, {
      type: "transfer-owner",
      user: admin,
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Revoke admin from Ada" })
      ).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Manage admins" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Revoke admin from Ada" })
    );

    expect(onAction).toHaveBeenNthCalledWith(2, {
      type: "remove-admin",
      user: admin,
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Revoke admin from Ada" })
      ).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Manage admins" }));
    fireEvent.click(await screen.findByRole("button", { name: "Page 2" }));
    await waitFor(() => {
      expect(Api.getRoomUsers).toHaveBeenLastCalledWith({
        id: "7",
        role: "admin",
        pageSize: 8,
        start: 9,
      });
    });
  });

  it("does not offer ownership transfer to the current user", async () => {
    render(
      <ChakraProvider value={theme}>
        <RoomPeopleDialog
          roomId="7"
          role="admin"
          creatorId="1"
          currentUserId="9"
          initialTotalCount={9}
          canManage
          canTransferOwnership
          refreshVersion={0}
          onAction={jest.fn()}
        />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage admins" }));
    expect(
      await screen.findByRole("button", { name: "Revoke admin from Ada" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Transfer ownership to Ada" })
    ).not.toBeInTheDocument();
  });
});
