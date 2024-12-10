import classNames from "classnames";
// import { SkeletonCircle, SkeletonText } from "@chakra-ui/react";
import { MessageTemplate } from "@/messages";
import { IMessage } from "@/interfaces/IMessage";
import { Indicator } from "./Indicator";
import { MouseEventHandler } from "react";
import { useMsgWatch } from "./hook";
import { updateRecallMessage } from "@/store/reducer/room";

interface IProps {
  data: IMessage;
  setIsOpen: (isOpen: boolean) => void;
}

export function Item({ data: message, setIsOpen }: IProps): JSX.Element {
  const dispatch = useThunkDispatch();
  const ref = useMsgWatch(message);
  const myUserInfo = useAppSelector((state) => state.user.data);
  const room = useAppSelector((state) => state.room.data);
  const isMe = myUserInfo?.id === message?.user?.id;
  const Component = useMemo(() => {
    const temp = MessageTemplate[message.contentType];
    if (!temp) return null;
    const { Component } = temp(message, room);
    return <Component />;
  }, [
    message,
    message?.contentType,
    message?.mediaMessage,
    message?.user,
    room,
  ]);
  if (message.contentType === "SYSTEM_MESSAGE") {
    return (
      <div ref={ref}>
        {Component}
      </div>
    );
  }
  if (message.contentType === "RECALL_MESSAGE") {
    return (
      <div ref={ref}>
        {Component}
      </div>
    );
  }
  const onContextMenu: MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isMe) return;
    e.preventDefault();
    setIsOpen(true);
    const menu = document.querySelector("[role=menu]")!;
    const popper = menu.parentElement!;
    const pageW = window.innerWidth;
    // const pageH = window.screen.height;
    let x = e.clientX;
    const y = e.clientY;
    if (x + menu.clientWidth > pageW) {
      x -= menu.clientWidth;
    }
    Object.assign(popper.style, {
      top: `${y}px`,
      left: `${x}px`,
    });
    dispatch(updateRecallMessage(message));
  };
  return (
    <div
      ref={ref}
      data-seq={message.seq}
      className={classNames("group relative flex flex-row items-start mb-2", {
        "flex-row-reverse": isMe,
      })}
    >
      <AvatarComponent
        size="md"
        name={message?.user?.username}
        src={message?.user?.image}
      />
      <div
        onContextMenu={onContextMenu}
        className="mx-2.5 max-w-[60%] rounded-lg overflow-hidden whitespace-pre-wrap bg-gray-800 shadow-md"
      >
        {Component}
      </div>
      <Indicator message={message} />
    </div>
  );
}

// TODO: TBC
// export function SkeletonItem({ isMe = false }: { isMe?: boolean }) {
//   return (
//     <div
//       className={classNames("relative flex flex-row items-start mb-2", {
//         "flex-row-reverse": isMe,
//       })}
//     >
//       <SkeletonCircle size="10" />
//       <span className="mx-2.5 max-w-[60%] rounded-lg whitespace-pre-wrap shadow-md">
//         <SkeletonText
//           className="flex-1 w-[200px] text-right rounded-lg overflow-hidden"
//           mr="2"
//           noOfLines={1}
//           spacing="2"
//           skeletonHeight="10"
//         />
//       </span>
//     </div>
//   );
// }
