import { FaPlus } from "react-icons/fa";
import { IUser } from "@/interfaces";
import { Button, IconButton } from "@chakra-ui/react";
import Api from "@/Api";
import { fetchUserInfoThunk } from "@/store/reducer/user";

export const AddFriendDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const navigation = useNavigate();
  const dispatch = useAppDispatch();
  const [acc, setAcc] = useState<IUser[]>([]);
  const handleSearch = async (v?: string) => {
    if (!v) {
      setAcc([]);
      return;
    }
    const res = await Api.queryUser({ userName: v });
    setAcc(res ?? []);
  };
  const handleAddFriend = async (id: string) => {
    if (!id) {
      return;
    }
    const res = await Api.addFriend({ id: id });
    if (!res?.id) return;
    await dispatch<any>(fetchUserInfoThunk());
    setAcc([]);
    onClose();
    navigation(`/room/${res.id}`);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent width={300}>
        <ModalHeader>Add Friend</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Input
            placeholder="Search friend"
            autoComplete="off"
            autoFocus
            onChange={(e) => {
              handleSearch(e.target.value);
            }}
          />
          <div className="flex flex-col gap-2">
            {acc.map((a) => {
              return (
                <div
                  className="mt-2 rounded-lg border-2 border-slate-900 border-solid px-0 my-2 flex gap-2 items-center justify-between flex-row"
                  key={a.id}
                >
                  <Avatar className="w-8 h-8" src={a.image} name={a.userName} />
                  <span className="flex-1">{a.userName}</span>
                  <IconButton
                    aria-label="Add Friend"
                    onClick={() => {
                      handleAddFriend(a.id);
                    }}
                    icon={<FaPlus />}
                  />
                </div>
              );
            })}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
