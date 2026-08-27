import SpideyLogo from "./SpideyLogo";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = true,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal dialog */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-red-900/40 bg-slate-950/95 p-6 shadow-[0_0_40px_rgba(220,38,38,0.3)] backdrop-blur-xl z-10 animate-fadeIn text-center">
        {/* Glow decoration */}
        <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-red-600/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-blue-600/20 blur-2xl pointer-events-none" />

        {/* Header Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 ring-4 ring-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
          {isDanger ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-7 w-7 text-red-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          ) : (
            <SpideyLogo size={28} />
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-slate-100 uppercase tracking-wide">
          {title}
        </h3>

        {/* Message */}
        <p className="mt-2 text-xs font-medium text-slate-400 leading-relaxed px-2">
          {message}
        </p>

        {/* Buttons */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={[
              "flex-1 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer",
              isDanger
                ? "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 shadow-red-950/60 ring-1 ring-red-500/50"
                : "bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 hover:from-red-500 hover:to-blue-500 shadow-blue-950/60 ring-1 ring-blue-500/50",
            ].join(" ")}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
