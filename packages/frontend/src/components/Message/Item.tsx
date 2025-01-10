import React, { MouseEventHandler } from "react";
import { MessageTemplate } from "@/messages";
import { IMessage } from "@/interfaces/IMessage";
import { Indicator } from "./Indicator";
import { useMsgWatch } from "./hook";
import { updateSelectedMessage } from "@/store/reducer/room";
import { WithProfile } from "../WithProfile";
import { useContextMenu } from "@/hooks";

interface IProps {
  readonly data: IMessage;
  readonly setIsOpen: (isOpen: boolean) => void;
}

export function Item({ data: message, setIsOpen }: IProps): React.JSX.Element {
  const dispatch = useThunkDispatch();
  const watchRef = useMsgWatch(message);
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const isMe = myUserInfo?.id === message?.user?.id;
  const Component = useMemo(() => {
    const temp = MessageTemplate[message.contentType];
    if (!temp) return null;
    const { Component } = temp(message, room);
    return <Component />;
  }, [message]);
  const SysComponent = useMemo(() => {
    const temp = MessageTemplate[message.contentType];
    if (!temp) return null;
    const { Component } = temp(message, room);
    return <Component />;
  }, [message, room.member]);
  const cb = useCallback<MouseEventHandler<HTMLDivElement>>(
    (e) => {
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
      setIsOpen(true);
      dispatch(updateSelectedMessage(message));
    },
    [message, room]
  );
  const contextMenu = useContextMenu(cb);
  if (message.contentType === "SYSTEM_MESSAGE") {
    return <>{SysComponent}</>;
  }
  if (message.contentType === "RECALL_MESSAGE") {
    return <>{Component}</>;
  }
  return (
    <div
      ref={watchRef}
      data-seq={message.seq}
      className={clsx("group relative flex flex-row items-start mb-2", {
        "flex-row-reverse": isMe,
      })}
    >
      <WithProfile profile={message.user}>
        <Avatar name={message?.user?.username} src={message?.user?.image} />
      </WithProfile>
      <div
        {...contextMenu}
        className="mx-2.5 max-w-[60%] rounded-lg overflow-hidden whitespace-pre-wrap bg-gray-800 shadow-md select-none"
        style={{
          WebkitUserSelect: "none",
        }}
      >
        {/* @ts-ignore */}
        <Reply className="mt-2.5" message={message.reply} />
        {Component}
      </div>
      <Indicator message={message} />
    </div>
  );
}
