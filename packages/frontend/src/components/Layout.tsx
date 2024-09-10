import { Sider } from "./Sider";

interface LayoutProps {
  children?: React.ReactNode;
}

export function Layout(props: LayoutProps) {
  return (
    <div className="h-full flex">
      <Sider />
      <div className="w-[calc(100%-288px)] flex flex-1 flex-col">
        {props.children}
      </div>
    </div>
  );
}
