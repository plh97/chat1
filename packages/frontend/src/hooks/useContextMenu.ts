import { MouseEventHandler, TouchEventHandler } from "react";

export const useContextMenu = (cb: Function) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  let isTouching = false;
  if (isIOS) {
    const onTouchStart: TouchEventHandler<HTMLDivElement> = (e) => {
      const touch = e.touches[0];
      let clientX = touch.pageX;
      let clientY = touch.pageY;
      isTouching = true;
      setTimeout(() => {
        if (isTouching) {
          cb({
            clientX,
            clientY,
          });
        }
      }, 500);
    };
    const onTouchEnd = () => {
      isTouching = false;
    };
    return {
      onTouchStart,
      onTouchEnd,
    };
  }
  const onContextMenu: MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    cb({
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };
  return { onContextMenu };
};
