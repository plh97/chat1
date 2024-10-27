import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface IProps {
  className?: string;
  name?: string;
  size?: string;
  src: string;
  count?: number;
}

// 1-1000
const generateColor = (name: string) => {
  const hash = name.charCodeAt(0) / 200;
  const randomColor = "#" + Math.floor(hash * 0xffffff).toString(16);
  return randomColor;
};

export const AvatarComponnet = ({
  name = "?",
  src,
  size = "xl",
  count = 0,
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
    // line-height: 16px;
    // padding: 0 .33rem;
    // text-align: center;
    return (
      <span className="absolute bg-rose-600 text-xs px-[0.33rem] text-white rounded-xl top-0 right-[-6px] text-center flex items-center justify-center">
        {c}
      </span>
    );
  }, [count]);
  return (
    <span className="relative">
      <Avatar {...args}>
        <AvatarImage src={src} />
        <AvatarFallback
          className={cn(size && `text-${size}`)}
          data-color={generateColor(name)}
          style={{
            // backgroundColor: 'red',
            backgroundColor: generateColor(name),
          }}
        >
          {name[0]}
        </AvatarFallback>
      </Avatar>
      {countMemo}
    </span>
  );
};
