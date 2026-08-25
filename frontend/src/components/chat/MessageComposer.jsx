import {
  useEffect,
  useRef,
  useState,
} from "react";

/** How long after the last keystroke before we send typing.stop */
const TYPING_TIMEOUT = 2000;
/** Minimum interval between typing.start WS messages (throttle) */
const TYPING_THROTTLE_MS = 2000;

const MessageComposer = ({
  onSend,
  onSendImage,
  onTypingStart,
  onTypingStop,
  disabled = false,
}) => {
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const lastTypingSentRef = useRef(0);

  const stopTyping = () => {
    if (!isTypingRef.current) {
      return;
    }
    isTypingRef.current = false;
    onTypingStop?.();
  };

  const startTyping = () => {
    if (isTypingRef.current) {
      return; // Already in typing state
    }

    const now = Date.now();
    // Throttle: only send typing.start at most once every TYPING_THROTTLE_MS
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) {
      return;
    }

    isTypingRef.current = true;
    lastTypingSentRef.current = now;
    onTypingStart?.();
  };

  const resetTypingTimeout = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT);
  };

  const handleChange = (event) => {
    const value = event.target.value;
    setContent(value);

    if (!value.trim() || disabled) {
      stopTyping();
      return;
    }

    startTyping();
    resetTypingTimeout();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image size must be less than 10MB.");
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if ((!trimmedContent && !selectedFile) || disabled || isUploading) {
      return;
    }

    if (selectedFile) {
      if (!onSendImage) return;
      setIsUploading(true);
      setUploadError(null);
      try {
        await onSendImage(selectedFile, trimmedContent);
        setContent("");
        clearSelectedFile();
        stopTyping();
      } catch (err) {
        setUploadError(err?.response?.data?.detail || "Failed to upload image to Web-Net.");
      } finally {
        setIsUploading(false);
      }
    } else {
      const sent = onSend(trimmedContent);
      if (sent !== false) {
        setContent("");
        stopTyping();

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        onTypingStop?.();
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [onTypingStop, previewUrl]);

  return (
    <div className="relative mt-auto border-t border-red-900/30 bg-slate-950/95 backdrop-blur-md p-2.5 sm:p-4 pb-safe z-10">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-4xl flex-col gap-2"
      >
        {/* Error notification */}
        {uploadError && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-950/40 px-3.5 py-2 text-xs text-red-300">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-red-400 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Selected Image Preview Pill */}
        {selectedFile && previewUrl && (
          <div className="relative flex items-center gap-3 rounded-2xl border border-red-500/40 bg-slate-900/90 p-2 sm:p-2.5 shadow-lg w-fit max-w-full animate-fadeIn shadow-red-950/50">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-slate-950 ring-2 ring-red-500/50">
              <img
                src={previewUrl}
                alt="Selected preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0 pr-6">
              <p className="truncate text-xs font-bold text-slate-100 max-w-[150px] sm:max-w-[200px]">
                {selectedFile.name}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <p className="text-[9px] sm:text-[10px] font-bold text-red-400 mt-0.5 tracking-wide">
                WEB ATTACHMENT READY
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelectedFile}
              className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white transition active:scale-95"
              title="Remove image"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-3">
          {/* File Attachment Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full border border-blue-900/40 bg-slate-900/80 text-blue-400 hover:border-red-500 hover:bg-red-950/40 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md active:scale-95"
            title="Attach Web Image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          {/* Text Area */}
          <div className="flex flex-1 items-end gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 sm:px-4 sm:py-3 shadow-inner transition focus-within:border-red-500 focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-red-500/30 min-w-0">
            <textarea
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || isUploading}
              rows={1}
              placeholder={
                disabled
                  ? "Connecting to Web-Net..."
                  : selectedFile
                  ? "Add a caption..."
                  : "Send a message..."
              }
              className="max-h-28 sm:max-h-32 min-h-[22px] sm:min-h-[24px] flex-1 resize-none bg-transparent text-sm sm:text-[15px] text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed leading-relaxed"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={disabled || isUploading || (!content.trim() && !selectedFile)}
            className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-red-600 via-red-700 to-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] transition hover:from-red-500 hover:to-blue-600 hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            aria-label="Send message"
          >
            {isUploading ? (
              <svg className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageComposer;