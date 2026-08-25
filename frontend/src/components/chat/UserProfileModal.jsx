import { getMediaUrl } from "../../services/api";
import SpideyLogo from "../common/SpideyLogo";

const UserProfileModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const displayName = user.first_name || user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.username;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-red-900/40 bg-slate-950/95 p-6 shadow-[0_0_35px_rgba(220,38,38,0.3)] backdrop-blur-xl z-10 animate-fadeIn">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-red-600/20 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-blue-600/20 blur-2xl" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:bg-red-950 hover:text-white transition"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>

        {/* Profile Card */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="relative mb-4 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-4 ring-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
            {user.profile_picture ? (
              <img
                src={getMediaUrl(user.profile_picture)}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-black text-red-400">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 justify-center">
            <SpideyLogo size={20} />
            <h2 className="text-xl font-black text-slate-100 tracking-wide">
              {displayName}
            </h2>
          </div>
          <p className="text-xs text-blue-400 font-bold tracking-wider mt-1">
            @{user.username}
          </p>

          <div className="w-full mt-5 border-t border-red-900/30 pt-4">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider text-left pl-1">
              Ally Hero Bio
            </h3>
            <p className="mt-2 rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-200 text-left border border-slate-800 whitespace-pre-wrap leading-relaxed">
              {user.bio || "This ally hasn't posted a Web-Verse bio yet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
