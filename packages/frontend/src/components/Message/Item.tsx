import { useSelector } from "react-redux";
import { USER } from "@/interfaces/IUser";
import { MessageTemplate } from "@/messages";
import { RootState } from "@/store";
import classNames from "classnames";
import { IMessage } from "@/interfaces/IMessage";
import { SkeletonCircle, SkeletonText } from "@chakra-ui/react";

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
export function Item({ data }: IProps): JSX.Element {
  const myUserInfo = useSelector<RootState, Partial<USER>>((state) => {
    return state.user.data;
  });
  const isMe = myUserInfo?._id === data.user?._id;
  const temp = MessageTemplate[data.contentType];
  const { component } = temp(data);
  return (
    <div
      className={classNames("relative flex flex-row items-start mb-2", {
        "flex-row-reverse": isMe,
      })}
    >
      <AvatarComponnet
        size="md"
        name={data.user?.username}
        src={data.user?.image}
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
