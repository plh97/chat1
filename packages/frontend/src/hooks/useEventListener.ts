import { CbFunction, WS_EVENT } from "core";

export const useEventListener = (eventName: WS_EVENT, handler: CbFunction) => {
  // Create a ref that stores handler
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener: typeof handler = (event) => {
      savedHandler.current(event);
    };
    ws.eventEmitter.on(eventName, listener);

    // Remove event listener on cleanup
    return () => {
      ws.eventEmitter.off(eventName, listener);
    };
  }, [eventName]);
};
