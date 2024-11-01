import { WS_EVENT } from "./constants";
import { EventEmitter } from "./eventEmitter";
import { CB, IWsData } from "./interface";
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

  private open = async () => {
    console.log("open");
    // handle something else logic here
    // 0. add heart beat
    this.heartBeat();
  };

  destroy() {
    // handle destroy logic
    console.log("destroy");
    this.socket.close();
    this.socket.removeEventListener("message", this.heartBeatFn);
    this.socket.removeEventListener("message", this.onMessageReceice);
    // this.socket = null;
  }

  // handle close logic
  close() {
    console.log("close");
  }

  // handle reconect logic
  error() {
    console.log("error");
  }

  async init() {
    await this.createWS(this.open, this.close, this.error);
  }

  heartBeatFn = ({ data }: any) => {
    if (data === "pong") {
      setTimeout(() => {
        this.send("ping");
      }, 5000);
    }
  };
  heartBeat = () => {
    this.socket.addEventListener("message", this.heartBeatFn);
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
    if (dataObj?.requestId && promisify) {
      if (dataObj.code === 0 || dataObj.code === 1) {
        promisify?.resolve(dataObj);
      } else {
        promisify?.reject(dataObj);
      }
      return;
    }
    this.eventEmitter.emit(WS_EVENT.READ_MSG, dataObj);
  };

  send = (data: object | string) => {
    if (typeof data === "object") {
      this.socket.send(JSON.stringify(data));
      // this.socket.
    } else {
      this.socket.send(data);
    }
  };

  sendMsg = <T>(msg: unknown, event = WS_EVENT.SEND_MSG) => {
    const reqId = generateTemplateId();
    this.send({ event, data: msg, requestId: reqId });
    return this.promisify(reqId) as Promise<IWsData<T>>;
  };
}
