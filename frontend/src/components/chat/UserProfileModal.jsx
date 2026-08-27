import { useState } from "react";
import { getMediaUrl } from "../../services/api";
import SpideyLogo from "../common/SpideyLogo";
import ImageModal from "./ImageModal";

const UserProfileModal = ({ isOpen, onClose, user }) => {
  const [isAvatarZoomOpen, setIsAvatarZoomOpen] = useState(false);

  if (!isOpen || !user) return null;

  const displayName = user.first_name || user.last_name
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : user.username;

  const avatarUrl = user.profile_picture || user.profile?.profile_picture
    ? getMediaUrl(user.profile_picture || user.profile?.profile_picture)
    : null;

  const bio = user.bio || user.profile?.bio;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
          onClick={onClose}
        />

        {/* Large Modal Content */}
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-900/40 bg-slate-950/95 shadow-[0_0_40px_rgba(220,38,38,0.3)] backdrop-blur-xl z-10 animate-fadeIn">
          {/* Header Banner */}
          <div className="relative h-28 bg-gradient-to-r from-red-950 via-slate-900 to-blue-950 p-4 border-b border-red-900/30 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <SpideyLogo size={24} />
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
                Web-Net Ally File
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-slate-400 hover:bg-red-950 hover:text-white transition"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Profile Details Container */}
          <div className="flex flex-col items-center text-center px-6 pb-6 -mt-14">
            {/* Large Avatar */}
            <div className="relative group mb-3">
              <div 
                onClick={() => avatarUrl && setIsAvatarZoomOpen(true)}
                className={[
                  "relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-4 ring-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all duration-300",
                  avatarUrl ? "cursor-pointer hover:ring-blue-500 hover:scale-105" : "",
                ].join(" ")}
                title={avatarUrl ? "Click to view large avatar" : ""}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-black text-red-400">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                {avatarUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-white drop-shadow">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                )}
              </div>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setIsAvatarZoomOpen(true)}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 border-2 border-slate-950 text-white shadow-md hover:bg-blue-500 transition active:scale-95 cursor-pointer"
                  title="View Full Size"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              )}
            </div>

            {/* Display Name & Username */}
            <h2 className="text-xl font-black text-slate-100 tracking-wide">
              {displayName}
            </h2>
            <p className="text-xs text-blue-400 font-bold tracking-wider mt-0.5">
              @{user.username}
            </p>

            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected Web Ally</span>
            </div>

            {/* Hero Bio Card */}
            <div className="w-full mt-5 border-t border-red-900/30 pt-4 text-left">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <span>Ally Hero Bio</span>
              </h3>
              <p className="mt-2 rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-slate-200 border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
                {bio || "This ally hasn't written a Web-Verse bio yet."}
              </p>
            </div>

            {/* Actions Footer */}
            <div className="w-full mt-6">
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition hover:from-red-500 hover:to-blue-500 active:scale-98 cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Full-Screen Viewer */}
      {avatarUrl && (
        <ImageModal
          isOpen={isAvatarZoomOpen}
          onClose={() => setIsAvatarZoomOpen(false)}
          imageUrl={avatarUrl}
        />
      )}
    </>
  );
};

export default UserProfileModal;

