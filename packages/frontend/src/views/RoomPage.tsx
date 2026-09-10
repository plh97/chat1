import { Header } from "@/components/Header";
import { InputBox } from "@/components/InputBox";
import { Message } from "@/components/Message";

export function RoomPage() {
  return (
    <section
      aria-label="Chat conversation"
      className="app-screen flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <Header className="safe-pt safe-px" />
      <Message className="safe-px" />
      <InputBox />
    </section>
  );
}
