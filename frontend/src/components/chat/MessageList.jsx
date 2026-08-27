import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useSelector,
} from "react-redux";

import {
  useMessages,
} from "../../hooks/useMessages";

import MessageBubble from "./MessageBubble";

/** How close to the bottom (in px) the user must be for auto-scroll to kick in. */
const SCROLL_BOTTOM_THRESHOLD = 150;
/** Minimum ms between scroll-triggered fetchMore calls. */
const FETCH_MORE_DEBOUNCE_MS = 300;

const MessageList = ({
  conversationId,
  canMarkMessagesRead,
  onMessageRead,
  isGroup = false,
}) => {
  const currentUser = useSelector(
    (state) => state.auth.user,
  );

  const {
    messages,
    isLoading,
    isLoadingMore,
    error,
    fetchInitial,
    fetchMore,
    hasMore,
    editMessage,
    removeMessage,
  } = useMessages(
    conversationId,
  );

  const containerRef =
    useRef(null);

  const previousScrollHeight =
    useRef(0);

  const observerRef =
    useRef(null);

  // Messages that this user has
  // already sent a read receipt for.
  const readMessagesRef =
    useRef(new Set());

  const pendingReadMessagesRef =
    useRef(new Set());

  // Track whether user is near bottom (for auto-scroll)
  const isNearBottomRef = useRef(true);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);
  const prevMessageCountRef = useRef(0);

  // Debounce timer for fetch-more
  const fetchMoreTimerRef = useRef(null);

  useEffect(() => {
    readMessagesRef.current.clear();
    pendingReadMessagesRef.current.clear();

    previousScrollHeight.current = 0;
    prevMessageCountRef.current = 0;
    isNearBottomRef.current = true;
    setShowNewMessagePill(false);
  }, [conversationId]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    messages.forEach((message) => {
      const hasCurrentUserReceipt =
        Boolean(
          message.readBy?.[
            String(currentUser.id)
          ],
        );

      if (hasCurrentUserReceipt) {
        readMessagesRef.current.add(
          String(message.id),
        );
      }
    });
  }, [
    currentUser?.id,
    messages,
  ]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    fetchInitial();
  }, [
    conversationId,
    fetchInitial,
  ]);

  // ── Smart auto-scroll logic ──────────────────────
  useEffect(() => {
    const container =
      containerRef.current;

    if (
      !container ||
      !messages.length
    ) {
      return;
    }

    const newMessageCount = messages.length;
    const addedCount = newMessageCount - prevMessageCountRef.current;
    prevMessageCountRef.current = newMessageCount;

    // First load — scroll to bottom
    if (
      previousScrollHeight.current === 0
    ) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });

      previousScrollHeight.current =
        container.scrollHeight;

      return;
    }

    const newScrollHeight =
      container.scrollHeight;

    // Messages were prepended (older messages loaded) — maintain scroll position
    if (
      addedCount > 0 &&
      newScrollHeight > previousScrollHeight.current &&
      !isNearBottomRef.current
    ) {
      // Check if user is scrolled up AND messages came at the top (fetchMore)
      const heightDelta = newScrollHeight - previousScrollHeight.current;
      requestAnimationFrame(() => {
        container.scrollTop += heightDelta;
      });
    }
    // New message arrived at the bottom
    else if (addedCount > 0 && addedCount <= 3) {
      if (isNearBottomRef.current) {
        // User is near the bottom — auto-scroll
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      } else {
        // User is scrolled up — show "new messages" pill
        setShowNewMessagePill(true);
      }
    }

    previousScrollHeight.current = newScrollHeight;
  }, [messages]);

  const handleMessageVisible =
    useCallback(
      (message) => {
        if (!message) {
          return true;
        }

        if (!canMarkMessagesRead) {
          return false;
        }

        // Don't mark our own messages
        // as read.
        if (
          String(message.sender) ===
          String(currentUser?.id)
        ) {
          return true;
        }

        const messageId =
          String(message.id);

        // Don't send the same read
        // receipt repeatedly.
        if (
          readMessagesRef.current.has(
            messageId,
          ) ||
          pendingReadMessagesRef.current.has(
            messageId,
          )
        ) {
          return true;
        }

        pendingReadMessagesRef.current.add(
          messageId,
        );

        const wasSent =
          onMessageRead?.(messageId);

        pendingReadMessagesRef.current.delete(
          messageId,
        );

        if (wasSent) {
          readMessagesRef.current.add(
            messageId,
          );

          return true;
        }

        return false;
      },
      [
        canMarkMessagesRead,
        currentUser?.id,
        onMessageRead,
      ],
    );

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    observerRef.current =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                !entry.isIntersecting
              ) {
                return;
              }

              const messageId =
                entry.target.dataset
                  .messageId;

              if (!messageId) {
                return;
              }

              const message =
                messages.find(
                  (item) =>
                    String(item.id) ===
                    String(messageId),
                );

              if (!message) {
                return;
              }

              const shouldUnobserve =
                handleMessageVisible(
                  message,
                );

              if (shouldUnobserve) {
                observerRef.current?.unobserve(
                  entry.target,
                );
              }
            },
          );
        },
        {
          root: container,
          threshold: 0.6,
        },
      );

    const messageElements =
      container.querySelectorAll(
        "[data-message-id]",
      );

    messageElements.forEach(
      (element) => {
        observerRef.current.observe(
          element,
        );
      },
    );

    return () => {
      observerRef.current?.disconnect();

      observerRef.current = null;
    };
  }, [
    messages,
    handleMessageVisible,
  ]);

  // ── Scroll handler: track near-bottom + trigger fetchMore ──
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track whether the user is near the bottom
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom < SCROLL_BOTTOM_THRESHOLD;

    // Dismiss new-messages pill when user scrolls back to bottom
    if (isNearBottomRef.current && showNewMessagePill) {
      setShowNewMessagePill(false);
    }

    // Debounced fetch-more for older messages
    if (
      container.scrollTop <= 100 &&
      hasMore &&
      !isLoadingMore
    ) {
      if (fetchMoreTimerRef.current) return; // Already scheduled

      fetchMoreTimerRef.current = setTimeout(async () => {
        fetchMoreTimerRef.current = null;
        previousScrollHeight.current = container.scrollHeight;
        await fetchMore();
      }, FETCH_MORE_DEBOUNCE_MS);
    }
  }, [hasMore, isLoadingMore, fetchMore, showNewMessagePill]);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (fetchMoreTimerRef.current) {
        clearTimeout(fetchMoreTimerRef.current);
      }
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
    setShowNewMessagePill(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-zinc-400"></div>
          <p className="text-sm text-zinc-500">
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-5">
        <p className="text-sm text-red-400">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-3 sm:px-5 py-4 sm:py-6"
      >
        {isLoadingMore && (
          <div className="mb-4 flex justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400"></div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 ring-4 ring-zinc-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-zinc-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h3 className="text-sm font-medium text-zinc-200">No messages yet</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Send a message to start the conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(
              (message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={
                    String(
                      message.sender,
                    ) ===
                    String(
                      currentUser?.id,
                    )
                  }
                  onEdit={(content) => editMessage(message.id, content)}
                  onDelete={() => removeMessage(message.id)}
                  isGroup={isGroup}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* "New messages ↓" pill — shown when user is scrolled up and new messages arrive */}
      {showNewMessagePill && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border border-red-500/50 bg-slate-950/90 px-4 py-2 text-xs font-bold text-red-300 shadow-lg shadow-red-950/50 backdrop-blur-md transition hover:bg-red-950/60 hover:text-white animate-bounce cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          New messages
        </button>
      )}
    </div>
  );
};

export default MessageList;
