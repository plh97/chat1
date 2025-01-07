import { WS_EVENT } from "./constants";
import { IWsData } from "./interface";

export type CbFunction = (data?: IWsData) => void;

export class Emitter<EVENT extends string> {
  events = Object.values(WS_EVENT).reduce((c, p) => {
    // @ts-ignore
    c[p] = [];
    return c;
  }, {}) as Record<EVENT, CbFunction[]>;

  on(event: EVENT, cb: CbFunction) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(cb);
  }

  off(event: EVENT, cb: CbFunction) {
    this.events[event] = this.events[event].filter((fn) => fn !== cb);
  }

  emit(event: EVENT, data?: IWsData) {
    console.log("NEW EVENT ~>", event);
    this.events[event].forEach((fn) => fn(data));
  }
}

export class EventEmitter extends Emitter<WS_EVENT> {}
