import "@testing-library/jest-dom";
import axios from "axios";

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
