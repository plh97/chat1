import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface IProps {
  className?: string;
  name?: string;
  size?: string;
  src: string;
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
  className,
  size = "xl",
  ...args
}: IProps) => {
  return (
    <Avatar className={cn(className)} {...args}>
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
  );
};
