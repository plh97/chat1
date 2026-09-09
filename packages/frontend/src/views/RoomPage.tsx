import { Header } from "@/components/Header";
import { InputBox } from "@/components/InputBox";
import { Message } from "@/components/Message";
import { CallProvider } from "@/components/Call";

export function RoomPage() {
  useAuth();
  useWebsocket();
  return (
    <CallProvider>
      <Layout>
        <Header className="safe-pt safe-px" />
        <Message className="safe-px" />
        <InputBox className="safe-px safe-pb" />
      </Layout>
    </CallProvider>
  );
}
