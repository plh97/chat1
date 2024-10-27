import { Item } from "./Item";
import { Scroll } from "./scroll";

export function Message() {
  const room = useAppSelector((state) => state.room.data);
  return (
    <Scroll>
      {room.message.map((msg) => (
        <Item key={msg.id} data={msg} />
      ))}
    </Scroll>
  );
}
