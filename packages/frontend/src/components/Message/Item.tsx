import { useSelector } from "react-redux";
import { USER } from "@/interfaces/IUser";
import { MessageTemplate } from "@/messages";
import { RootState } from "@/store";
import classNames from "classnames";
import { IMessage } from "@/interfaces/IMessage";
import { SkeletonCircle, SkeletonText } from "@chakra-ui/react";
import { useIntersectionObserver } from "usehooks-ts";
import { markReadMessageThunk } from "@/store/action/message";

interface IProps {
  data: IMessage;
}
/**
 * Pure Componennt
 *
 * @export
 * @param {IProps} { data }
 * @return {JSX.Element}
 */
export function Item({ data: message }: IProps): JSX.Element {
  const room = useAppSelector((state) => state.room.data);
  const user = useAppSelector((state) => state.user.data);
  const dispatch = useThunkDispatch();
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.5,
  });

  useEffect(() => {
    if (!isIntersecting) return;
    // if i am sender
    if (message.user.id === user.id) return;
    if (room.readSeq?.[user?.id] !== undefined) {
      if (message.seq <= room.readSeq?.[user?.id]) return;
    }
    console.log(message.textMessage?.text);
    dispatch(markReadMessageThunk({ message, user }));
  }, [isIntersecting]);
  const myUserInfo = useSelector<RootState, Partial<USER>>((state) => {
    return state.user.data;
  });
  const isMe = myUserInfo?.id === message.user?.id;
  const temp = MessageTemplate[message.contentType];
  const { component } = temp(message);
  return (
    <div
      data-seq={message.seq}
      ref={ref}
      className={classNames("relative flex flex-row items-start mb-2", {
        "flex-row-reverse": isMe,
      })}
    >
      <AvatarComponnet
        size="md"
        name={message.user?.username}
        src={message.user?.image}
      />
      <span className="mx-2.5 max-w-[60%] rounded-lg whitespace-pre-wrap bg-gray-800 shadow-md">
        {component}
      </span>
    </div>
  );
}

export function SkeletonItem({ isMe = false }: { isMe?: boolean }) {
  return (
    <div
      className={classNames("relative flex flex-row items-start mb-2", {
        "flex-row-reverse": isMe,
      })}
    >
      <SkeletonCircle size="10" />
      <span className="mx-2.5 max-w-[60%] rounded-lg whitespace-pre-wrap shadow-md">
        <SkeletonText
          className="flex-1 w-[200px] text-right rounded-lg overflow-hidden"
          mr="2"
          noOfLines={1}
          spacing="2"
          skeletonHeight="10"
        />
      </span>
    </div>
  );
}
