import Api from "@/Api";
import type { IMessage, IRoom } from "@/interfaces";

jest.mock("@/Api", () => ({
  __esModule: true,
  default: {
    updateRoom: jest.fn(),
  },
}));

import { initialMessage, updateRoomThunk } from "./room";

describe("updateRoomThunk", () => {
  it("preserves the active message window when room metadata is updated", async () => {
    const message = [{ id: "message-1", seq: 1 }] as IMessage[];
    const updatedRoom = {
      id: "room-1",
      name: "Updated room",
      message: [],
      totalCount: 0,
    } as IRoom;
    (Api.updateRoom as jest.Mock).mockResolvedValue(updatedRoom);

    const dispatch = jest.fn();
    const getState = () => ({
      room: {
        data: {
          message,
          totalCount: 42,
          hasMoreMessage: true,
        },
      },
    });

    await (updateRoomThunk({ id: "room-1", name: "Updated room" }) as any)(
      dispatch,
      getState
    );

    expect(dispatch).toHaveBeenCalledWith(
      initialMessage({
        ...updatedRoom,
        message,
        totalCount: 42,
        hasMoreMessage: true,
      })
    );
  });
});
