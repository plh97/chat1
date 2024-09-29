import { WS_EVENT } from "./constants";
import { IWsData } from "./interface";

type CbFunction = (data: IWsData) => void;

const initEvent = Object.values(WS_EVENT).reduce((c, p) => {
  // @ts-ignore
  c[p] = [];
  return c;
}, {}) as Record<WS_EVENT, CbFunction[]>;

export class EventEmitter {
  private events = initEvent;

  on(event: WS_EVENT, cb: CbFunction) {
    this.events[event].push(cb);
  }

  off(event: WS_EVENT, cb: CbFunction) {
    this.events[event] = this.events[event].filter((fn) => fn !== cb);
  }

  emit(event: WS_EVENT, data: IWsData) {
    console.log("NEW EVENT ~>", event);
    this.events[event].forEach((fn) => fn(data));
  }
}
