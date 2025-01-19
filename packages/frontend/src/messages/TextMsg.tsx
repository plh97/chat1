import { IMessage } from "@/interfaces/IMessage";
import { Link } from "@chakra-ui/react";

const formatLink = (paragraph?: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = paragraph?.split(urlRegex) ?? [];
  const navigate = useNavigate();
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      if (part.indexOf(location.origin) === 0) {
        return (
          <Link
            key={i}
            onClick={() => {
              console.log(part.replace(location.origin, ""));
              navigate(part.replace(location.origin, ""));
            }}
            color="green.300"
            className="font-bold"
          >
            {part}
          </Link>
        );
      }
      return (
        <Link
          key={i}
          href={part}
          target="_blank"
          color="green.300"
          className="font-bold"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
};

export const Component = ({ message }: { message: IMessage }) => {
  return (
    <div className="box-content p-2.5">
      {formatLink(message.textMessage?.text)}
    </div>
  );
};

export const TextMsg = (message: IMessage) => {
  return {
    Preview: () => <>{message.textMessage?.text}</>,
    Component: () => <Component message={message} />,
  };
};
