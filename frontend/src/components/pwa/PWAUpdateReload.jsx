import React, { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

const PWAUpdateReload = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSWFn, setUpdateSWFn] = useState(null);

  useEffect(() => {
    try {
      const updateSW = registerSW({
        onNeedRefresh() {
          setNeedRefresh(true);
        },
        onOfflineReady() {
          setOfflineReady(true);
          // Auto hide offline ready after 4 seconds
          setTimeout(() => setOfflineReady(false), 4000);
        },
      });
      setUpdateSWFn(() => updateSW);
    } catch (e) {
      console.warn("Service worker registration skipped:", e);
    }
  }, []);

  const handleUpdate = () => {
    if (updateSWFn) {
      updateSWFn(true);
    } else {
      window.location.reload();
    }
  };

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm w-[calc(100%-2rem)] p-4 rounded-2xl bg-[#140827]/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-950/60 text-white animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shrink-0 shadow-md shadow-pink-500/20">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {needRefresh ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            )}
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">
            {needRefresh ? "Update Available" : "Offline Ready"}
          </h4>
          <p className="text-xs text-purple-200/80 mt-0.5 leading-relaxed">
            {needRefresh
              ? "A new version of MB_chat is available. Tap update to refresh."
              : "MB_chat is now ready for fast offline access."}
          </p>

          <div className="mt-3 flex items-center gap-2">
            {needRefresh && (
              <button
                type="button"
                onClick={handleUpdate}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition active:scale-95 cursor-pointer"
              >
                Update Now
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setNeedRefresh(false);
                setOfflineReady(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-purple-200 text-xs font-medium transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateReload;
