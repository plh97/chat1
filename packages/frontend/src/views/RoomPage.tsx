import { Header } from "@/components/Header";
import { InputBox } from "@/components/InputBox";
import { Message } from "@/components/Message";

export function RoomPage() {
  useAuth();
  useWebsocket();
  return (
    <Layout>
      <Header className="safe-pt safe-px" />
      <Message className="safe-px" />
      <InputBox className="safe-px safe-pb" />
    </Layout>
  );
}
