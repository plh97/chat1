import Api from "@/Api";
import { useAppSelector, useThunkDispatch } from "@/hooks/app";
import { IMessage } from "@/interfaces";
import { openMessageWindowThunk } from "@/store/reducer/room";
import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { focusMessage } from "./hook";
import { resolveMessageUserReferences } from "@/store/reducer/userReferences";

const SEARCH_PAGE_SIZE = 20;

const messageText = (message: IMessage) =>
  message.textMessage?.text?.trim() || "(empty text message)";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

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
  const profileUpdates = useAppSelector(
    (state) => state.user?.profileUpdates ?? {}
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
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

  const closeSearch = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeSearch();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch, open]);

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
    } catch (searchError: unknown) {
      setError(errorMessage(searchError, "Unable to search messages"));
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
        closeSearch(false);
        focusMessage(String(windowData.targetId), targetIndex);
      }
    } catch (locateError: unknown) {
      setError(errorMessage(locateError, "Unable to locate message"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Search messages"
        title="Search messages"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? "message-search-dialog" : undefined}
        className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl text-slate-200 transition hover:bg-slate-700 active:scale-95 active:bg-slate-600 md:h-10 md:w-10 md:rounded-md"
        onClick={() => (open ? closeSearch() : setOpen(true))}
      >
        <Search className="h-5 w-5" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Dismiss message search"
            className="fixed inset-0 z-40 cursor-default bg-black/55 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none"
            onClick={() => closeSearch()}
          />
          <section
            id="message-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search messages"
            className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] top-[calc(env(safe-area-inset-top)+4.5rem)] z-50 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-600 bg-slate-800 shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-12 md:max-h-[70vh] md:w-[min(26rem,calc(100vw-2rem))] md:rounded-lg"
          >
            <form
              className="flex shrink-0 gap-2 border-b border-slate-700 p-3"
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
                className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-base text-white outline-none focus:border-cyan-400 md:rounded-md md:text-sm"
              />
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="touch-manipulation rounded-xl bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 transition active:scale-95 disabled:opacity-50 md:rounded-md"
              >
                Search
              </button>
              <button
                type="button"
                aria-label="Close search"
                onClick={() => closeSearch()}
                className="touch-manipulation rounded-xl p-2 text-slate-300 transition hover:bg-slate-700 active:scale-95 active:bg-slate-600 md:rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </form>

            <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {results.map((message) => {
                const displayedMessage = resolveMessageUserReferences(
                  message,
                  profileUpdates
                );
                return (
                  <button
                    type="button"
                    key={message.id}
                    onClick={() => locateMessage(message)}
                    className="block w-full touch-manipulation border-b border-slate-700 px-4 py-3 text-left transition hover:bg-slate-700 active:bg-slate-600"
                  >
                    <div className="line-clamp-2 text-sm text-slate-100">
                      {highlightMatches(
                        messageText(displayedMessage),
                        submittedQuery
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {displayedMessage.user?.userName ?? message.userId} · #
                      {message.seq}
                    </div>
                  </button>
                );
              })}
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
                  className="w-full touch-manipulation p-3 text-sm text-cyan-300 transition hover:bg-slate-700 active:bg-slate-600"
                >
                  Load more ({results.length}/{totalCount})
                </button>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
