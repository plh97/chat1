import {
  configureStore,
  EnhancedStore,
  AnyAction,
  ThunkDispatch,
} from "@reduxjs/toolkit";
import { roomReducer, IState as RoomState } from "../reducer/room";
import { userReducer, IState as UserState } from "../reducer/user";
import type { IMessage } from "../../interfaces";

// Define the RootState type
interface RootState {
  room: RoomState;
  user: UserState;
}

// Define WS_EVENT locally since we're mocking it
const WS_EVENT = {
  SEND_MSG: "WS_SEND_MESSAGE",
};

// Create mock toast that we can track - must be before imports
const mockToast = jest.fn();

// Setup the createStandaloneToast mock before importing message actions
(global as any).createStandaloneToast = jest.fn(() => ({
  toast: mockToast,
}));

// Mock dependencies
jest.mock("@/utils/formatMessage", () => ({
  formatMessage: jest.fn((msg) => Promise.resolve(msg)),
}));

// Mock ws object
const mockWsSendMsgPromise = jest.fn();
const mockWsSendMsg = jest.fn();

// Define ws globally as it would be in the app
(global as any).ws = {
  sendMsgPromise: mockWsSendMsgPromise,
  sendMsg: mockWsSendMsg,
};

// NOW import the actions after mocks are set up
import {
  sendMessageAction,
  markReadMessageThunk,
  recallMessageThunk,
} from "./message";

describe("Message Actions", () => {
  let store: EnhancedStore<
    RootState,
    AnyAction,
    [ThunkDispatch<RootState, undefined, AnyAction>]
  >;

  beforeEach(() => {
    // Create a fresh store before each test
    store = configureStore({
      reducer: {
        room: roomReducer,
        user: userReducer,
      },
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("sendMessageAction", () => {
    it("should send a message successfully", async () => {
      // Arrange
      const mockMessage: Partial<IMessage> = {
        channelId: "channel-123",
        content: "Hello, World!",
        contentType: "TEXT_MESSAGE",
        userId: "user-123",
      };

      const mockResponseMessage: IMessage = {
        id: "msg-123",
        channelId: "channel-123",
        content: "Hello, World!",
        contentType: "TEXT_MESSAGE",
        userId: "user-123",
        seq: 1,
        user: {
          id: "user-123",
          username: "testuser",
          image: "",
          bio: "",
          QQ: "",
          WeChat: "",
          github: "",
          permission: "",
          room: [],
          friend: [],
          friendId: [],
          UserId: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWsSendMsgPromise.mockResolvedValue({
        code: 0,
        data: mockResponseMessage,
        message: "Success",
      });

      // Act
      await store.dispatch(sendMessageAction(mockMessage) as any);

      // Assert
      expect(mockWsSendMsgPromise).toHaveBeenCalledWith(mockMessage);

      const state = store.getState();
      const messages = state.room.data.message;
      expect(messages).toContainEqual(mockResponseMessage);
    });

    it("should handle message with reply", async () => {
      // Arrange
      const replyMessage: IMessage = {
        id: "reply-msg-123",
        channelId: "channel-123",
        content: "Original message",
        contentType: "TEXT_MESSAGE",
        userId: "user-456",
        seq: 1,
        user: {
          id: "user-456",
          username: "otheruser",
          image: "",
          bio: "",
          QQ: "",
          WeChat: "",
          github: "",
          permission: "",
          room: [],
          friend: [],
          friendId: [],
          UserId: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Set up reply message in state
      store.dispatch({
        type: "message/updateReplyMessage",
        payload: replyMessage,
      });

      const mockMessage: Partial<IMessage> = {
        channelId: "channel-123",
        content: "Reply to original",
        contentType: "TEXT_MESSAGE",
        userId: "user-123",
      };

      const mockResponseMessage: IMessage = {
        id: "msg-124",
        channelId: "channel-123",
        content: "Reply to original",
        contentType: "TEXT_MESSAGE",
        userId: "user-123",
        replyId: "reply-msg-123",
        seq: 2,
        user: {
          id: "user-123",
          username: "testuser",
          image: "",
          bio: "",
          QQ: "",
          WeChat: "",
          github: "",
          permission: "",
          room: [],
          friend: [],
          friendId: [],
          UserId: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWsSendMsgPromise.mockResolvedValue({
        code: 0,
        data: mockResponseMessage,
        message: "Success",
      });

      // Act
      await store.dispatch(sendMessageAction(mockMessage) as any);

      // Assert
      expect(mockWsSendMsgPromise).toHaveBeenCalledWith(
        expect.objectContaining({
          replyId: "reply-msg-123",
        })
      );
    });

    it("should handle error and show toast", async () => {
      // Arrange
      const mockMessage: Partial<IMessage> = {
        channelId: "channel-123",
        content: "Hello",
        contentType: "TEXT_MESSAGE",
        userId: "user-123",
      };

      const errorMessage = "Failed to send message";
      mockWsSendMsgPromise.mockResolvedValue({
        code: 1,
        data: null,
        message: errorMessage,
      });

      // Act
      const result: any = await store.dispatch(
        sendMessageAction(mockMessage) as any
      );

      // Assert
      expect(mockToast).toHaveBeenCalledWith({
        description: errorMessage,
        status: "error",
        position: "top",
        duration: 1000,
      });

      // Should reject
      expect(result.meta.requestStatus).toBe("rejected");
    });

    it("should clear reply message after sending", async () => {
      // Arrange
      const replyMessage: IMessage = {
        id: "reply-msg-123",
        channelId: "channel-123",
        content: "Original message",
        contentType: "TEXT_MESSAGE",
        userId: "user-456",
        seq: 1,
        user: {
          id: "user-456",
          username: "otheruser",
          image: "",
          bio: "",
          QQ: "",
          WeChat: "",
          github: "",
          permission: "",
          room: [],
          friend: [],
          friendId: [],
          UserId: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch({
        type: "message/updateReplyMessage",
        payload: replyMessage,
      });

      const mockMessage: Partial<IMessage> = {
        channelId: "channel-123",
        content: "Test",
        contentType: "TEXT_MESSAGE",
        userId: "user-123",
      };

      const mockResponseMessage: IMessage = {
        id: "msg-125",
        channelId: "channel-123",
        content: "Test",
        contentType: "TEXT_MESSAGE",
        userId: "user-123",
        seq: 2,
        user: {
          id: "user-123",
          username: "testuser",
          image: "",
          bio: "",
          QQ: "",
          WeChat: "",
          github: "",
          permission: "",
          room: [],
          friend: [],
          friendId: [],
          UserId: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWsSendMsgPromise.mockResolvedValue({
        code: 0,
        data: mockResponseMessage,
        message: "Success",
      });

      // Act
      await store.dispatch(sendMessageAction(mockMessage) as any);

      // Assert
      const state = store.getState();
      expect(state.room.replyMessage).toBeUndefined();
    });
  });

  describe("markReadMessageThunk", () => {
    it("should send mark read message", async () => {
      // Arrange
      const message: Partial<IMessage> = {
        channelId: "channel-123",
        id: "msg-123",
        seq: 5,
      };

      // Act
      await store.dispatch(markReadMessageThunk(message) as any);

      // Assert
      expect(mockWsSendMsg).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: "channel-123",
          id: "msg-123",
          seq: 5,
          contentType: "READ_MESSAGE",
        }),
        WS_EVENT.SEND_MSG
      );
    });

    it("should not send message if channelId is missing", async () => {
      // Arrange
      const message: Partial<IMessage> = {
        id: "msg-123",
        seq: 5,
      };

      // Act
      await store.dispatch(markReadMessageThunk(message) as any);

      // Assert
      expect(mockWsSendMsg).not.toHaveBeenCalled();
    });

    it("should handle undefined channelId", async () => {
      // Arrange
      const message: Partial<IMessage> = {
        channelId: undefined,
        id: "msg-123",
      };

      // Act
      await store.dispatch(markReadMessageThunk(message) as any);

      // Assert
      expect(mockWsSendMsg).not.toHaveBeenCalled();
    });
  });

  describe("recallMessageThunk", () => {
    it("should send recall message", async () => {
      // Arrange
      const message: Partial<IMessage> = {
        channelId: "channel-123",
        id: "msg-123",
        content: "Message to recall",
      };

      // Act
      await store.dispatch(recallMessageThunk(message) as any);

      // Assert
      expect(mockWsSendMsg).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: "channel-123",
          id: "msg-123",
          content: "Message to recall",
          contentType: "RECALL_MESSAGE",
        }),
        WS_EVENT.SEND_MSG
      );
    });

    it("should not send message if channelId is missing", async () => {
      // Arrange
      const message: Partial<IMessage> = {
        id: "msg-123",
        content: "Message to recall",
      };

      // Act
      await store.dispatch(recallMessageThunk(message) as any);

      // Assert
      expect(mockWsSendMsg).not.toHaveBeenCalled();
    });

    it("should handle empty channelId", async () => {
      // Arrange
      const message: Partial<IMessage> = {
        channelId: "",
        id: "msg-123",
      };

      // Act
      await store.dispatch(recallMessageThunk(message) as any);

      // Assert
      expect(mockWsSendMsg).not.toHaveBeenCalled();
    });

    it("should include all message properties when recalling", async () => {
      // Arrange
      const message: Partial<IMessage> = {
        channelId: "channel-123",
        id: "msg-123",
        content: "Message to recall",
        userId: "user-123",
        seq: 10,
      };

      // Act
      await store.dispatch(recallMessageThunk(message) as any);

      // Assert
      expect(mockWsSendMsg).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: "channel-123",
          id: "msg-123",
          content: "Message to recall",
          userId: "user-123",
          seq: 10,
          contentType: "RECALL_MESSAGE",
        }),
        WS_EVENT.SEND_MSG
      );
    });
  });
});
