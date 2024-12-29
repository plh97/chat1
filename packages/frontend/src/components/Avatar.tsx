import * as Avatar from "@radix-ui/react-avatar";
import "./avatar.css";

interface IProps extends React.PropsWithChildren {
  className?: string;
  name?: string;
  size?: 'md' | 'lg' | 'xl';
  src: string;
  count?: number;
}

// 1-1000
const generateColor = (name: string) => {
  const hash = name.charCodeAt(0) / 200;
  const randomColor = "#" + Math.floor(hash * 0xffffff).toString(16);
  return randomColor;
};

export const AvatarComponent = ({
  name = "?",
  src,
  size = "xl",
  count = 0,
  children,
  ...args
}: IProps) => {
  const countMemo = useMemo(() => {
    if (count < 1 || isNaN(count)) {
      return null;
    }
    let c = count.toString();
    if (count > 99) {
      c = "99+";
    }
    return (
      <span className="absolute bg-rose-600 text-xs px-[0.33rem] text-white rounded-xl top-0 right-[-6px] text-center flex items-center justify-center">
        {c}
      </span>
    );
  }, [count]);
  return (
    <span className="relative">
      <Avatar.Root
        {...args}
        style={{
          // backgroundColor: 'red',
          backgroundColor: generateColor(name),
        }}
        className={clsx("AvatarRoot", {
          lg: size === "lg",
        })}
      >
        <Avatar.Image className="AvatarImage" src={src} alt="avatar" />
        <Avatar.Fallback
          // style={{ width: "100px", height: "100px" }}
          className="AvatarFallback"
        >
          {name.slice(0, 2)}
        </Avatar.Fallback>
      </Avatar.Root>
      {countMemo}
      {children}
    </span>
  );
};
