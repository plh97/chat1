import ReconnectingWebSocket from "reconnecting-websocket";
import { WS_EVENT } from "./constants";
import { EventEmitter } from "./eventEmitter";
import { CB, IWsData } from "./interface";
import { generateTemplateId, getToken } from "./utils";

type Promisify = {
  resolve: (value: unknown) => void;
  reject: (value: unknown) => void;
};

export class SocketClient {
  socket?: ReconnectingWebSocket;
  eventEmitter: EventEmitter;
  promiseMap: Record<string, Promisify> = {};
  url: string;
  isError = false;
  constructor({ url }: { url: string }) {
    this.url = url;
    this.eventEmitter = new EventEmitter();
    this.init();
    window.onoffline = () => {
      this.error("offline");
    };

    window.ononline = () => {
      this.init();
    };
  }

  init() {
    this.socket = new ReconnectingWebSocket(this.url, getToken());
    this.createWS(this.open, this.close, this.error);
    // @ts-ignore
    window.socket = this.socket;
  }

  promisify = (requestId: string) => {
    return new Promise((resolve, reject) => {
      this.promiseMap[requestId] = { resolve, reject };
    });
  };

  destroy() {
    // handle destroy logic
    console.log("destroy");
    this.socket?.close();
    this.socket?.removeEventListener("message", this.onMessageReceive);
  }

  private readonly open = async (e: any) => {
    console.log("open", e);
    // handle something else logic here
    // 0. add heart beat
    // this.heartBeat();
    if (this.isError) {
      this.eventEmitter.emit(WS_EVENT.RECONNECT, e);
      this.isError = false;
    }
  };

  // handle close logic
  close(error: unknown) {
    this.eventEmitter.emit(WS_EVENT.DISCONNECT);
    console.log("[WS] close", error);
    this.isError = true;
  }

  // handle error logic
  error(error: unknown) {
    this.eventEmitter.emit(WS_EVENT.DISCONNECT);
    console.log("[WS] error", error);
    this.isError = true;
  }

  createWS = (open: CB, close: CB, error: CB): Promise<void> => {
    return new Promise((resolve) => {
      this.socket?.addEventListener("open", () => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          open();
          resolve();
        }
      });
      this.socket?.addEventListener("close", close.bind(this));
      this.socket?.addEventListener("message", this.onMessageReceive);
      this.socket?.addEventListener("error", error.bind(this));
    });
  };

  onMessageReceive = ({ data }: any) => {
    // handle heart beat
    if (data === "pong") {
      return;
    }
    const dataObj = JSON.parse(data) as IWsData<unknown>;
    ///////////////// handle promisify
    const promisify = this.promiseMap[dataObj?.requestId];
    if (dataObj?.requestId && promisify) {
      if (dataObj.code === 0 || dataObj.code === 1) {
        promisify?.resolve(dataObj);
      } else {
        promisify?.reject(dataObj);
      }
      return;
    }
    this.eventEmitter.emit(dataObj.event, dataObj);
  };

  send = (data: object | string) => {
    if (typeof data === "object") {
      this.socket?.send(JSON.stringify(data));
    } else {
      this.socket?.send(data);
    }
  };

  sendMsg = <T>(msg: unknown, event = WS_EVENT.SEND_MSG) => {
    const reqId = generateTemplateId();
    this.send({ event, data: msg, requestId: reqId });
  };

  sendMsgPromise = <T>(msg: unknown, event = WS_EVENT.SEND_MSG) => {
    const reqId = generateTemplateId();
    this.send({ event, data: msg, requestId: reqId });
    return this.promisify(reqId) as Promise<IWsData<T>>;
  };
}
