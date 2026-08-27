import { createContext, useContext, useState, useCallback } from "react";
import SpideyLogo from "./SpideyLogo";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      title,
      message,
      type = "info", // "success" | "error" | "info" | "warning"
      duration = 3800,
      action = null, // { label: string, onClick: () => void }
    }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newToast = {
        id,
        title,
        message,
        type,
        action,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (message, title = "Success") => {
      return showToast({ title, message, type: "success" });
    },
    [showToast]
  );

  const showError = useCallback(
    (message, title = "Error") => {
      return showToast({ title, message, type: "error" });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message, title = "Web-Net Alert") => {
      return showToast({ title, message, type: "info" });
    },
    [showToast]
  );

  // Global window event listener so non-React contexts (WebSocket, API) can dispatch toasts
  useEffect(() => {
    const handleCustomToast = (event) => {
      if (event.detail) {
        showToast(event.detail);
      }
    };
    window.addEventListener("spidey_toast", handleCustomToast);
    return () => {
      window.removeEventListener("spidey_toast", handleCustomToast);
    };
  }, [showToast]);

  return (

    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        removeToast,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-fadeIn",
              toast.type === "success"
                ? "bg-slate-950/95 border-emerald-500/40 text-slate-100 shadow-[0_0_25px_rgba(16,185,129,0.25)]"
                : toast.type === "error"
                ? "bg-slate-950/95 border-red-500/50 text-slate-100 shadow-[0_0_25px_rgba(239,68,68,0.3)]"
                : toast.type === "warning"
                ? "bg-slate-950/95 border-amber-500/40 text-slate-100 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                : "bg-slate-950/95 border-blue-500/40 text-slate-100 shadow-[0_0_25px_rgba(37,99,235,0.25)]",
            ].join(" ")}
          >
            {/* Icon */}
            <div className="shrink-0 pt-0.5">
              {toast.type === "success" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              ) : toast.type === "error" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-950/80 border border-red-500/50 text-red-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
              ) : toast.type === "warning" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950/80 border border-blue-500/50">
                  <SpideyLogo size={18} />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <h4
                  className={[
                    "text-xs font-bold uppercase tracking-wider",
                    toast.type === "success"
                      ? "text-emerald-400"
                      : toast.type === "error"
                      ? "text-red-400"
                      : toast.type === "warning"
                      ? "text-amber-400"
                      : "text-blue-400",
                  ].join(" ")}
                >
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-slate-200 mt-0.5 break-words font-medium leading-relaxed">
                {toast.message}
              </p>

              {/* Action Button */}
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action.onClick?.();
                    removeToast(toast.id);
                  }}
                  className="mt-2 inline-flex items-center rounded-lg bg-gradient-to-r from-red-600 to-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:from-red-500 hover:to-blue-500 transition active:scale-95 cursor-pointer"
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-white transition rounded-md hover:bg-slate-800"
              aria-label="Close notification"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: () => {},
      showSuccess: () => {},
      showError: () => {},
      showInfo: () => {},
      removeToast: () => {},
    };
  }
  return context;
};
