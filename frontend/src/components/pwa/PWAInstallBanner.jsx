import React, { useState, useEffect } from "react";
import usePWAInstall from "../../hooks/usePWAInstall";

const PWAInstallBanner = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("pwa_install_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };

  // Do not show if already installed, dismissed, or not on an installable context
  if (isInstalled || isDismissed) return null;
  if (!isInstallable && !isIOS) return null;

  return (
    <>
      <aside 
        aria-label="Install MB_chat application"
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-md p-3.5 sm:p-4 rounded-2xl bg-[#110722]/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-950/70 text-white animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-center gap-3">
          {/* App Icon */}
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-700 p-0.5 shrink-0 shadow-lg shadow-purple-600/30">
            <img
              src="/pwa-192x192.png"
              alt="MB_chat Icon"
              className="w-full h-full object-cover rounded-[10px]"
            />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              Install MB_chat
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/30 rounded text-pink-300">
                PWA
              </span>
            </h4>
            <p className="text-xs text-purple-200/70 truncate mt-0.5">
              Install on home screen for full app experience
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 active:scale-95 transition cursor-pointer"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              title="Dismiss"
              className="p-1.5 rounded-lg text-purple-300/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl bg-[#140827] border border-purple-500/30 p-6 text-white shadow-2xl shadow-purple-950/80 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/40">
              <div className="flex items-center gap-2.5">
                <img src="/pwa-192x192.png" alt="MB_chat" className="w-8 h-8 rounded-lg" />
                <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSInstructions(false)}
                className="p-1 text-purple-300/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-purple-200/90 leading-relaxed">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/30">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white font-bold shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  Tap the <strong className="text-pink-300">Share</strong> button (
                  <svg className="inline w-4 h-4 mx-0.5 text-sky-400 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  or Safari share icon) at the bottom/top of your browser bar.
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/30">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white font-bold shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  Scroll down and tap <strong className="text-pink-300">Add to Home Screen</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/30">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white font-bold shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  Tap <strong className="text-pink-300">Add</strong> in the top right. <strong>MB_chat</strong> will appear as a standalone app!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallBanner;
