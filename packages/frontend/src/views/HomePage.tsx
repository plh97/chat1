import { CallProvider } from "@/components/Call";

export function HomePage() {
  useAuth();
  useWebsocket();
  return (
    <CallProvider>
      <Layout>
        <div className="flex flex-1 flex-col"></div>
      </Layout>
    </CallProvider>
  );
}
