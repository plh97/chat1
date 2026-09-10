import { Side } from "./Side";
import { useMatch } from "react-router-dom";

interface LayoutProps {
  readonly children?: React.ReactNode;
}

export function Layout(props: LayoutProps) {
  const isRoomRoute = Boolean(useMatch("/room/:id"));

  return (
    <div className="flex h-full overflow-hidden overscroll-none">
      <Side />
      <main
        className={clsx(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-none",
          { "max-md:hidden": !isRoomRoute }
        )}
      >
        {props.children}
      </main>
    </div>
  );
}
