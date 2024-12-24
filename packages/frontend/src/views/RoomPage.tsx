import { Header } from "@/components/Header";
import { InputBox } from "@/components/InputBox";
import { Message } from "@/components/Message";

export function RoomPage() {
  useAuth();
  useWebsocket();
  return (
    <Layout>
      <Header />
      <Message className="px-safe" />
      <InputBox className="pb-safe" />
    </Layout>
  );
}
