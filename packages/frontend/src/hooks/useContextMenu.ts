import {
  MouseEventHandler,
  TouchEventHandler,
  useCallback,
  useEffect,
  useRef,
} from "react";

const LONG_PRESS_DELAY = 500;
const TOUCH_CONTEXT_MENU_GUARD = 1000;

export const useContextMenu = (
  cb: (position: { clientX: number; clientY: number }) => void
) => {
  const callbackRef = useRef(cb);
  const longPressTimerRef = useRef<number | null>(null);
  const ignoreContextMenuUntilRef = useRef(0);

  useEffect(() => {
    callbackRef.current = cb;
  }, [cb]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  const onTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    cancelLongPress();
    ignoreContextMenuUntilRef.current = Date.now() + TOUCH_CONTEXT_MENU_GUARD;
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const position = { clientX: touch.clientX, clientY: touch.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      ignoreContextMenuUntilRef.current = Date.now() + TOUCH_CONTEXT_MENU_GUARD;
      callbackRef.current(position);
    }, LONG_PRESS_DELAY);
  };

  const cancelTouchLongPress: TouchEventHandler<HTMLDivElement> = () => {
    cancelLongPress();
    ignoreContextMenuUntilRef.current = Date.now() + TOUCH_CONTEXT_MENU_GUARD;
  };

  const onContextMenu: MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    if (Date.now() < ignoreContextMenuUntilRef.current) return;
    cancelLongPress();
    callbackRef.current({
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  return {
    onTouchStart,
    onTouchMove: cancelTouchLongPress,
    onTouchEnd: cancelTouchLongPress,
    onTouchCancel: cancelTouchLongPress,
    onContextMenu,
  };
};
