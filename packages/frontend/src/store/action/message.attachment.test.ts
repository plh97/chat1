import { configureStore } from "@reduxjs/toolkit";
import type { IMessage } from "@/interfaces";
import { roomReducer } from "@/store/reducer/room";
import { userReducer } from "@/store/reducer/user";

jest.mock("@/config", () => ({
  apiUrl: "",
  wsUrl: "",
}));

jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "test-message-id"),
}));

jest.mock("@/utils/formatMessage", () => ({
  formatMessage: jest.fn((message) => Promise.resolve(message)),
}));

const mockWsSendMsgPromise = jest.fn();
(global as any).ws = {
  sendMsgPromise: mockWsSendMsgPromise,
  sendMsg: jest.fn(),
};

import { sendMessageAction } from "./message";

describe("attachment messages", () => {
  it("sends an attachment and caption in the same message", async () => {
    const store = configureStore({
      reducer: {
        room: roomReducer,
        user: userReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
    });
    const file = new File(["image"], "photo.png", { type: "image/png" });
    const message: Partial<IMessage> = {
      channelId: "channel-123",
      contentType: "MEDIA_MESSAGE",
      userId: "user-123",
      textMessage: {
        text: "this is my photo",
        mention: [],
      },
      mediaMessage: {
        file,
        url: "",
        width: null,
        height: null,
        thumbnail: null,
        extension: "png",
        name: file.name,
        size: file.size,
        fileType: file.type,
        duration: null,
      },
    };
    mockWsSendMsgPromise.mockResolvedValue({
      code: 0,
      data: {
        ...message,
        id: "msg-media-123",
        seq: 1,
        user: store.getState().user.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      message: "Success",
    });

    await store.dispatch(sendMessageAction(message));

    expect(mockWsSendMsgPromise).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "MEDIA_MESSAGE",
        textMessage: {
          text: "this is my photo",
          mention: [],
        },
        mediaMessage: expect.objectContaining({
          file,
          name: "photo.png",
          fileType: "image/png",
        }),
      })
    );
  });
});
