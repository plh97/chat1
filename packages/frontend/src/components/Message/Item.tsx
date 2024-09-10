import { useSelector } from "react-redux";
import { USER } from "@/interfaces/IUser";
import { MessageTemplate } from "@/messages";
import { RootState } from "@/store";
import { IMessage } from "@chatroom/core";
import classNames from "classnames";

interface IProps {
  data: IMessage & { user: USER };
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
      <AvatarComponnet size="md" name={data.user?.username} src={data.user?.image} />
      <span className="mx-2.5 max-w-[60%] rounded-lg whitespace-pre-wrap bg-gray-800 shadow-md">
        {component}
      </span>
    </div>
  );
}
