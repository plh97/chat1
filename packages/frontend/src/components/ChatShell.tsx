import { Outlet, useMatch } from "react-router-dom";
import { Suspense } from "react";
import { CallProvider } from "@/components/Call";
import useAuth from "@/hooks/useAuth";
import useWebsocket from "@/hooks/useWebsocket";
import { Layout } from "./Layout";

export function ChatShell() {
  const roomMatch = useMatch("/room/:id");

  useAuth();
  useWebsocket(roomMatch?.params.id ?? "");

  return (
    <CallProvider>
      <Layout>
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading chat"
              className="flex min-h-0 flex-1 items-center justify-center text-slate-400"
            >
              Loading...
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </Layout>
    </CallProvider>
  );
}
