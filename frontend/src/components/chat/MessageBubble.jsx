import { memo, useState } from "react";
import ImageModal from "./ImageModal";
import { getMediaUrl } from "../../services/api";

const MessageBubble = memo(({
  message,
  isOwn,
  onEdit,
  onDelete,
  onRetry,
  isGroup = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isHovered, setIsHovered] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const readBy = Object.values(
    message.readBy ?? {},
  );

  const isRead =
    isOwn &&
    readBy.length > 0;

  const isEdited =
    message.updated_at &&
    new Date(message.updated_at) - new Date(message.created_at) > 1000;

  const imageUrl = message.image_url ? getMediaUrl(message.image_url) : null;

  const isSending = message.status === "sending";
  const isFailed = message.status === "failed";

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editContent.trim() && editContent !== message.content) {
      await onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditContent(message.content);
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit(e);
    }
  };

  return (
    <>
      <div
        data-message-id={message.id}
        className={["flex group mb-2.5", isOwn ? "justify-end" : "justify-start"].join(" ")}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => isOwn && setIsHovered((prev) => !prev)}
      >
        <div className={["relative flex flex-col max-w-[88%] sm:max-w-[75%]", isOwn ? "items-end" : "items-start"].join(" ")}>
          {/* Actions Menu */}
          {isOwn && !isEditing && !isSending && !isFailed && (
            <div className={["absolute -top-3.5 right-2 sm:right-4 flex items-center gap-1 rounded-lg border border-red-500/40 bg-slate-950/95 p-1 shadow-lg transition-opacity duration-200 z-10 backdrop-blur-md", isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"].join(" ")}>
              {message.content && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition active:scale-95"
                  aria-label="Edit message"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="rounded p-1 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition active:scale-95"
                aria-label="Delete message"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          )}

          <div
            className={[
              "rounded-2xl shadow-md relative overflow-hidden transition-all duration-200 backdrop-blur-sm",
              isOwn
                ? "rounded-br-sm bg-gradient-to-r from-red-600 via-red-700 to-rose-700 text-white shadow-[0_4px_15px_rgba(220,38,38,0.35)] border border-red-500/30"
                : "rounded-bl-sm bg-slate-950/85 border border-blue-500/30 text-slate-100 shadow-[0_4px_15px_rgba(37,99,235,0.25)]",
              imageUrl ? "p-1.5" : "px-4 py-2.5",
              isSending ? "opacity-70" : "",
              isFailed ? "opacity-60 border-red-400/60" : "",
            ].join(" ")}
          >
            {!isOwn && isGroup && (
              <p className="mb-1 px-2 pt-1 text-xs font-bold text-sky-400">
                {message.sender_username}
              </p>
            )}

            {/* Image display */}
            {imageUrl && (
              <div
                onClick={() => setIsImageModalOpen(true)}
                className="group/img relative cursor-pointer overflow-hidden rounded-xl bg-slate-950/60 border border-slate-800"
              >
                <img
                  src={imageUrl}
                  alt="Chat attachment"
                  className="max-h-72 w-full max-w-sm rounded-xl object-cover transition-transform duration-300 group-hover/img:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/80 text-white shadow-lg backdrop-blur-sm ring-2 ring-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </span>
                </div>
              </div>
            )}

            {/* Text message content */}
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-2 min-w-50 p-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full resize-none rounded-lg border border-red-400 bg-red-950/70 p-2 text-sm text-white placeholder:text-red-200 outline-none focus:border-white transition"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(message.content);
                    }}
                    className="text-[11px] font-medium text-red-200 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editContent.trim()}
                    className="rounded bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-slate-100 disabled:opacity-50 transition"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              message.content && (
                <p className={["whitespace-pre-wrap wrap-break-word text-[15px] leading-relaxed", imageUrl ? "mt-2 px-2.5 pb-1" : ""].join(" ")}>
                  {message.content}
                </p>
              )
            )}

            {/* Message Metadata (Timestamp & Read Status) */}
            {!isEditing && (
              <div className={["flex items-center justify-end gap-1.5 opacity-90", imageUrl ? "px-2.5 pb-1 mt-1" : "mt-1"].join(" ")}>
                <p className={["text-[10px] flex items-center font-semibold", isOwn ? "text-rose-200" : "text-sky-300/80"].join(" ")}>
                  {isEdited && <span className="mr-1 text-[9px] opacity-70 italic">(edited)</span>}
                  {new Date(
                    message.created_at,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                {isOwn && (
                  <span
                    className={
                      isFailed
                        ? "inline-flex items-center text-red-300"
                        : isSending
                        ? "inline-flex items-center text-rose-200 opacity-70 animate-pulse"
                        : isRead
                        ? "inline-flex items-center text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                        : "inline-flex items-center text-rose-200 opacity-90"
                    }
                    aria-label={
                      isFailed
                        ? "Failed"
                        : isSending
                        ? "Sending"
                        : isRead
                        ? "Read"
                        : "Sent"
                    }
                  >
                    {isFailed ? (
                      /* ✗ error icon */
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    ) : isSending ? (
                      /* clock icon */
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    ) : isRead ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"></path><path d="m22 10-7.5 7.5L13 16"></path></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    )}
                  </span>
                )}
              </div>
            )}

            {/* Failed message — retry button */}
            {isFailed && isOwn && (
              <button
                onClick={onRetry}
                className="mt-1 text-[10px] font-bold text-red-200 underline underline-offset-2 hover:text-white transition"
              >
                Tap to retry
              </button>
            )}
          </div>
        </div>
      </div>

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={imageUrl}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparator — only re-render when relevant props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.image_url === nextProps.message.image_url &&
    prevProps.message.updated_at === nextProps.message.updated_at &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.isGroup === nextProps.isGroup &&
    // Compare readBy by reference count (faster than deep compare)
    Object.keys(prevProps.message.readBy ?? {}).length ===
    Object.keys(nextProps.message.readBy ?? {}).length
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
