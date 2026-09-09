import { FaPlus } from "react-icons/fa";
import type { UIEvent } from "react";
import {
  Button,
  IconButton,
  Spinner,
  Text,
} from "@/components/ui/chakra-compat";
import type { IUser } from "@/interfaces";
import Api from "@/Api";
import { fetchUserInfoThunk } from "@/store/reducer/user";

const PAGE_SIZE = 10;
const LOAD_MORE_THRESHOLD = 48;

export const AddFriendDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const navigation = useNavigate();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<IUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);
  const requestVersionRef = useRef(0);
  const toast = useToast();

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    const userName = query.trim();
    setUsers([]);
    setTotalCount(0);
    loadingRef.current = false;
    setIsLoading(false);

    if (!isOpen || !userName) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      loadingRef.current = true;
      setIsLoading(true);
      Api.queryUser({
        userName,
        pageSize: PAGE_SIZE,
        start: 0,
      })
        .then((response) => {
          if (cancelled || requestVersion !== requestVersionRef.current) {
            return;
          }
          setUsers(response.users ?? []);
          setTotalCount(response.totalCount ?? 0);
        })
        .catch(() => {
          if (cancelled || requestVersion !== requestVersionRef.current) {
            return;
          }
          setUsers([]);
          setTotalCount(0);
          toast({
            title: "Unable to search users",
            status: "error",
            duration: 2000,
          });
        })
        .finally(() => {
          if (!cancelled && requestVersion === requestVersionRef.current) {
            loadingRef.current = false;
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isOpen, query, toast]);

  const hasMore = users.length < totalCount;

  const loadMore = useCallback(async () => {
    const userName = query.trim();
    if (!isOpen || !userName || !hasMore || loadingRef.current) return;

    const requestVersion = requestVersionRef.current;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      const response = await Api.queryUser({
        userName,
        pageSize: PAGE_SIZE,
        start: users.length,
      });
      if (requestVersion !== requestVersionRef.current) return;

      setUsers((currentUsers) => {
        const usersById = new Map(
          currentUsers.map((user) => [String(user.id), user])
        );
        for (const user of response.users ?? []) {
          usersById.set(String(user.id), user);
        }
        return Array.from(usersById.values());
      });
      setTotalCount(response.totalCount ?? 0);
    } catch {
      if (requestVersion !== requestVersionRef.current) return;
      toast({
        title: "Unable to load more users",
        status: "error",
        duration: 2000,
      });
    } finally {
      if (requestVersion === requestVersionRef.current) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [hasMore, isOpen, query, toast, users.length]);

  const handleResultsScroll = (event: UIEvent<HTMLDivElement>) => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight <= LOAD_MORE_THRESHOLD) {
      void loadMore();
    }
  };

  const handleClose = () => {
    setQuery("");
    setUsers([]);
    setTotalCount(0);
    loadingRef.current = false;
    onClose();
  };

  const handleAddFriend = async (id: string) => {
    if (!id) return;
    const room = await Api.addFriend({ id });
    if (!room?.id) return;
    await dispatch<any>(fetchUserInfoThunk());
    handleClose();
    navigation(`/room/${room.id}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent width="sm" maxH="90vh">
        <ModalHeader>Add Friend</ModalHeader>
        <ModalCloseButton />
        <ModalBody display="flex" minH="0" flexDirection="column">
          <Input
            value={query}
            placeholder="Search friend"
            autoComplete="off"
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
          <div
            className="mt-4 flex min-h-40 max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1"
            onScroll={handleResultsScroll}
          >
            {isLoading && users.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner aria-label="Searching users" />
              </div>
            ) : users.length ? (
              <>
                {users.map((user) => (
                  <div
                    className="flex items-center gap-2 rounded-lg border-2 border-solid border-slate-900 px-2 py-1"
                    key={user.id}
                  >
                    <Avatar
                      className="h-8 w-8"
                      src={user.image}
                      name={user.userName}
                    />
                    <span className="flex-1">{user.userName}</span>
                    <IconButton
                      aria-label={`Add ${user.userName}`}
                      onClick={() => handleAddFriend(user.id)}
                    >
                      <FaPlus />
                    </IconButton>
                  </div>
                ))}
                {isLoading ? (
                  <div className="flex justify-center py-3">
                    <Spinner size="sm" aria-label="Loading more users" />
                  </div>
                ) : !hasMore ? (
                  <Text color="fg.muted" py="2" textAlign="center">
                    All users loaded
                  </Text>
                ) : null}
              </>
            ) : query.trim() ? (
              <Text color="fg.muted" textAlign="center" mt="8">
                No users found
              </Text>
            ) : null}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
