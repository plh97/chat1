import { on } from "events";
import { MouseEventHandler } from "react";

export const useContextMenu = (cb: Function) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    let t = -1;
    const onTouchStart = () => {
      t = Date.now();
    };
    const onTouchEnd = () => {
      if (Date.now() - t > 500) {
        cb();
      }
    };
    return {
      onTouchStart,
      onTouchEnd,
    };
  }
  const onContextMenu: MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const menu = document.querySelector("[role=menu]")!;
    const popper = menu.parentElement!;
    const pageW = window.innerWidth;
    let x = e.clientX;
    const y = e.clientY;
    if (x + menu.clientWidth > pageW) {
      x -= menu.clientWidth;
    }
    Object.assign(popper.style, {
      top: `${y}px`,
      left: `${x}px`,
    });
    cb();
  };
  return onContextMenu;
};
