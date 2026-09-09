import Api from "@/Api";
import { IMessage } from "@/interfaces";
import { openMessageWindowThunk } from "@/store/reducer/room";
import { Loader2, Search, X } from "lucide-react";
import { focusMessage } from "./hook";

const SEARCH_PAGE_SIZE = 20;

const messageText = (message: IMessage) =>
  message.textMessage?.text?.trim() || "(empty text message)";

const highlightMatches = (text: string, query: string) => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;

  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(${escapedQuery})`, "gi");

  return text.split(matcher).map((part, index) =>
    part.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase() ? (
      <mark
        // A message can contain the same match more than once.
        key={`${index}-${part}`}
        className="rounded-sm bg-yellow-300 px-0.5 text-slate-950"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
};

export function MessageSearch() {
  const dispatch = useThunkDispatch();
  const roomId = useAppSelector((state) => state.room.data.id);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState<IMessage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOpen(false);
    setQuery("");
    setSubmittedQuery("");
    setResults([]);
    setTotalCount(0);
  }, [roomId]);

  const search = async (searchQuery: string, start = 0) => {
    const normalizedQuery = searchQuery.trim();
    if (!roomId || !normalizedQuery || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await Api.searchRoomMessages({
        id: roomId,
        q: normalizedQuery,
        pageSize: SEARCH_PAGE_SIZE,
        start,
      });
      setSubmittedQuery(normalizedQuery);
      setTotalCount(response.totalCount);
      setResults((current) =>
        start ? [...current, ...response.message] : response.message
      );
    } catch (searchError: any) {
      setError(searchError?.message ?? "Unable to search messages");
    } finally {
      setLoading(false);
    }
  };

  const locateMessage = async (message: IMessage) => {
    if (!roomId) return;
    setLoading(true);
    setError("");
    try {
      const windowData = await dispatch(
        openMessageWindowThunk({
          roomId,
          id: String(message.id),
          pageSize: 50,
        })
      ).unwrap();
      const targetIndex = windowData.message.findIndex(
        (item) => String(item.id) === String(windowData.targetId)
      );
      if (targetIndex >= 0) {
        setOpen(false);
        focusMessage(String(windowData.targetId), targetIndex);
      }
    } catch (locateError: any) {
      setError(locateError?.message ?? "Unable to locate message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Search messages"
        title="Search messages"
        className="flex h-10 w-10 items-center justify-center rounded-md text-slate-200 transition hover:bg-slate-700"
        onClick={() => setOpen((value) => !value)}
      >
        <Search className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 flex max-h-[70vh] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-2xl">
          <form
            className="flex gap-2 border-b border-slate-700 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              search(query);
            }}
          >
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages"
              className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            >
              Search
            </button>
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setOpen(false)}
              className="rounded-md p-2 text-slate-300 hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </form>

          <div className="overflow-y-auto">
            {results.map((message) => (
              <button
                type="button"
                key={message.id}
                onClick={() => locateMessage(message)}
                className="block w-full border-b border-slate-700 px-4 py-3 text-left hover:bg-slate-700"
              >
                <div className="line-clamp-2 text-sm text-slate-100">
                  {highlightMatches(messageText(message), submittedQuery)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {message.user?.userName ?? message.userId} · #{message.seq}
                </div>
              </button>
            ))}
            {!loading && submittedQuery && results.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No messages found
              </div>
            ) : null}
            {error ? (
              <div className="p-3 text-sm text-red-300">{error}</div>
            ) : null}
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
              </div>
            ) : null}
            {!loading && results.length < totalCount ? (
              <button
                type="button"
                onClick={() => search(submittedQuery, results.length)}
                className="w-full p-3 text-sm text-cyan-300 hover:bg-slate-700"
              >
                Load more ({results.length}/{totalCount})
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
