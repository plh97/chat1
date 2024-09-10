import { WS_EVENT } from "./constants";
import { EventEmitter } from "./eventEmitter";
import { CB, CHANNEL_TYPE, IWsData } from "./interface";
import { generateTemplateId, getToken } from "./utils";

type Promisify = {
  resolve: (value: unknown) => void;
  reject: (value: unknown) => void;
};

export class SocketClient {
  socket: WebSocket;
  eventEmitter: EventEmitter;
  promiseMap: Record<string, Promisify> = {};
  constructor(url: string) {
    this.eventEmitter = new EventEmitter();
    this.socket = new WebSocket(url, getToken());
    this.init();
  }

  promisify = (requestId: string) => {
    return new Promise((resolve, reject) => {
      this.promiseMap[requestId] = { resolve, reject };
    });
  };

  open = async () => {
    console.log("open");
    // handle something else logic here
    // 0. add heart beat
    this.heartBeat();
    this.socket.send("ping");
  };

  async login() {
    const reqId = generateTemplateId();
    this.send({ event: WS_EVENT.LOGIN, data: getToken(), requestId: reqId });
    return this.promisify(reqId);
  }

  close() {
    // handle close logic
    console.log("close");
  }

  error() {
    // handle reconect logic
    console.log("error");
  }

  async init() {
    await this.createWS(this.open, this.close, this.error);
  }

  heartBeat = (t = 20000) => {
    this.socket.addEventListener("message", ({ data }) => {
      if (data === "pong") {
        setTimeout(() => {
          this.send("ping");
        }, t);
      }
    });
    this.send("ping");
  };

  createWS = (open: CB, close: CB, error: CB): Promise<void> => {
    return new Promise((resolve) => {
      this.socket.addEventListener("open", () => {
        if (this.socket.readyState === WebSocket.OPEN) {
          open();
          resolve();
        }
      });
      this.socket.addEventListener("close", close);
      this.socket.addEventListener("message", this.onMessageReceice);
      this.socket.addEventListener("error", error);
    });
  };

  onMessageReceice = ({ data }: any) => {
    // handle heart beat
    if (data === "pong") {
      return;
    }
    const dataObj = JSON.parse(data) as IWsData<unknown>;
    ///////////////// handle promisify
    const promisify = this.promiseMap[dataObj?.requestId];
    if (dataObj?.event === WS_EVENT.SEND_MSG) {
      // treat as a async request
      if (dataObj?.requestId && promisify) {
        if (dataObj.code === 0) {
          promisify?.resolve(dataObj);
        } else {
          promisify?.reject(dataObj);
        }
        return;
      }
      // treat as a normal message push
      this.eventEmitter.emit(WS_EVENT.SEND_MSG, dataObj);
      return;
    }
    // TODO: need remove
    if (dataObj?.event === WS_EVENT.SUBSCRIBE) {
      this.eventEmitter.emit(WS_EVENT.SUBSCRIBE, dataObj);
      return;
    }
    ///////////////// handle login
    if (dataObj?.event === WS_EVENT.LOGIN) {
      this.eventEmitter.emit(WS_EVENT.LOGIN, dataObj);
      return;
    }
    console.error("unalbe handle", dataObj);
  };

  on = (channels: string[], cb: CB) => {
    this.send({ channels, event: WS_EVENT.SUBSCRIBE });
    cb();
  };
  off = (channels: string[], cb: CB) => {
    this.send({ channels, event: WS_EVENT.UN_SUBSCRIBE });
    cb();
  };

  send = (data: object | string) => {
    if (typeof data === "object") {
      this.socket.send(JSON.stringify(data));
      // this.socket.
    } else {
      this.socket.send(data);
    }
  };

  subscribe = async ({ channels }: { channels: CHANNEL_TYPE[] }, cb: CB) => {
    await this.login();
    this.on(channels, cb);
    return () => {
      this.off(channels, cb);
    };
  };

  sendMsg = <T>(msg: unknown) => {
    const reqId = generateTemplateId();
    this.send({ event: WS_EVENT.SEND_MSG, data: msg, requestId: reqId });
    return this.promisify(reqId) as Promise<IWsData<T>>;
  };
}
