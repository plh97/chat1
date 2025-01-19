import * as AvatarComponent from "@radix-ui/react-avatar";
import "./styles.css";
import { FaCamera } from "react-icons/fa";

interface IProps extends React.PropsWithChildren {
  className?: string;
  name?: string;
  size?: "md" | "lg" | "xl";
  src?: string;
  count?: number;
  onChange?: (files: File[]) => Promise<void>;
  showBorder?: boolean;
  marginEnd?: string;
}

const generateColor = (name: string) => {
  const hash = name.charCodeAt(0) / 200;
  return "#" + Math.floor(hash * 0xffffff).toString(16);
};

export const Avatar = ({
  name = "?",
  src,
  size = "md",
  count = 0,
  children,
  onChange,
  showBorder = true,
  marginEnd = "",
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
      <AvatarComponent.Root
        {...args}
        style={{
          // backgroundColor: 'red',
          backgroundColor: generateColor(name),
          marginInlineEnd: marginEnd,
        }}
        className={clsx("AvatarRoot", size, {
          "border-2 border-black": showBorder,
        })}
      >
        <AvatarComponent.Image className="AvatarImage" src={src} alt="avatar" />
        <AvatarComponent.Fallback className="AvatarFallback">
          {name.slice(0, 2)}
        </AvatarComponent.Fallback>
      </AvatarComponent.Root>
      {countMemo}
      {children}
    </span>
  );
};
