import React, { MouseEventHandler } from "react";
import Api from "@/Api";
import { MessageTemplate } from "@/messages";
import { IMessage } from "@/interfaces/IMessage";
import { Indicator } from "./Indicator";
import { scrollToMessageIndex, useMsgWatch } from "./hook";
import { mergeMessages, updateSelectedMessage } from "@/store/reducer/room";
import { WithProfile } from "../WithProfile";
import { useContextMenu } from "@/hooks";

interface IProps {
  readonly data: IMessage;
  readonly setIsOpen: (isOpen: boolean) => void;
}

export function Item({ data: message, setIsOpen }: IProps): React.JSX.Element {
  const dispatch = useThunkDispatch();
  const toast = useToast();
  const watchRef = useMsgWatch(message);
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const isMe = myUserInfo?.userId === message?.user?.userId;
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

  const navigateToMessage = (messageId: string, index: number) => {
    window.requestAnimationFrame(() => {
      scrollToMessageIndex(index);
      window.requestAnimationFrame(() => {
        const target = document.querySelector(
          `[data-id="${messageId}"] [data-msg]`
        );
        target?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
        target?.classList.add("brightness-200");
        window.setTimeout(() => {
          target?.classList.remove("brightness-200");
        }, 1000);
      });
    });
  };

  const handleNavigateReply = async (msg: IMessage) => {
    const targetIndex = room.message.findIndex((item) => item.id === msg.id);
    if (targetIndex >= 0) {
      navigateToMessage(String(msg.id), targetIndex);
      return;
    }

    if (room.id) {
      try {
        const windowData = await Api.getRoomMessageWindow({
          id: String(msg.id),
          roomId: String(room.id),
          pageSize: 50,
        });
        dispatch(mergeMessages(windowData.message));
        const merged = [...room.message, ...windowData.message];
        const unique = new Map<string, IMessage>();
        for (const item of merged) {
          unique.set(String(item.id), item);
        }
        const sortedMessages = Array.from(unique.values()).sort(
          (a, b) => a.seq - b.seq
        );
        const loadedTargetIndex = sortedMessages.findIndex(
          (item) => item.id === msg.id
        );
        if (loadedTargetIndex >= 0) {
          navigateToMessage(String(msg.id), loadedTargetIndex);
          return;
        }
      } catch (error) {
        // Fall through to toast below if lookup fails.
      }
    }

    const dom = document.querySelector(`[data-id="${msg.id}"] [data-msg]`);
    if (!dom) {
      toast({
        title: "Message not found",
        description: "The original message is not loaded in the current list.",
        status: "error",
        position: "top",
      });
      return;
    }
    dom?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
    dom?.classList.add("brightness-200");
    setTimeout(() => {
      dom?.classList.remove("brightness-200");
    }, 1000);
  };
  return (
    <div
      ref={watchRef}
      data-id={message.id}
      data-seq={message.seq}
      className={clsx("group relative flex flex-row items-start mb-2", {
        "flex-row-reverse": isMe,
      })}
    >
      <WithProfile profile={message.user}>
        <Avatar name={message?.user?.userName} src={message?.user?.image} />
      </WithProfile>
      <div
        {...contextMenu}
        className="mx-2.5 max-w-[60%] rounded-lg overflow-hidden whitespace-pre-wrap bg-gray-800 shadow-md"
        data-msg
      >
        {message.reply ? (
          <Reply
            className="mt-2.5"
            message={message.reply}
            onClick={handleNavigateReply}
          />
        ) : null}
        {Component}
      </div>
      <Indicator message={message} />
    </div>
  );
}
