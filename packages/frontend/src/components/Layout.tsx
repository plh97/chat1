import { Side } from "./Side";

interface LayoutProps {
  readonly children?: React.ReactNode;
}

export function Layout(props: LayoutProps) {
  return (
    <div className="flex h-dvh overflow-hidden overscroll-none">
      <Side />
      <div className="w-[calc(100%-288px)] flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none">
        {props.children}
      </div>
    </div>
  );
}
