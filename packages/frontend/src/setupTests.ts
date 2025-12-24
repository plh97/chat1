import "@testing-library/jest-dom";
import axios from "axios";

// Mock core module
jest.mock("core", () => ({
  WS_EVENT: {
    PING: "WS_PING",
    PONG: "WS_PONG",
    RECONNECT: "RECONNECT",
    DISCONNECT: "DISCONNECT",
    SEND_MSG: "WS_SEND_MESSAGE",
  },
  SocketClient: jest.fn(),
}));

// Mock global ws
(global as any).ws = {
  sendMsgPromise: jest.fn(),
  sendMsg: jest.fn(),
};

// Mock global Axios
(global as any).Axios = axios;

// Mock global createStandaloneToast
(global as any).createStandaloneToast = jest.fn(() => ({
  toast: jest.fn(),
}));
