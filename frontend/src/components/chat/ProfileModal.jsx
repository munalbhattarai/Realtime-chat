import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateCurrentUser } from "../../features/auth/authApi";
import { setUser } from "../../features/auth/authSlice";
import { getMediaUrl } from "../../services/api";
import SpideyLogo from "../common/SpideyLogo";
import ImageModal from "./ImageModal";
import { useToast } from "../common/ToastContext";

const ProfileModal = ({ isOpen, onClose }) => {
  const currentUser = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const { showSuccess, showError } = useToast();

  const [bio, setBio] = useState(currentUser?.profile?.bio || "");
  const [firstName, setFirstName] = useState(currentUser?.first_name || "");
  const [lastName, setLastName] = useState(currentUser?.last_name || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentUser?.profile?.profile_picture || null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isAvatarZoomOpen, setIsAvatarZoomOpen] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setBio(currentUser?.profile?.bio || "");
      setFirstName(currentUser?.first_name || "");
      setLastName(currentUser?.last_name || "");
      setPreview(currentUser?.profile?.profile_picture || null);
      setFile(null);
      setError(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        showError("Image exceeds 10MB limit.");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("first_name", firstName);
      formData.append("last_name", lastName);
      formData.append("bio", bio);
      
      if (file) {
        formData.append("profile_picture", file);
      }

      const updatedUser = await updateCurrentUser(formData);
      dispatch(setUser(updatedUser));
      showSuccess("Web profile updated successfully!");
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Failed to update web profile.";
      setError(errMsg);
      showError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const avatarUrl = preview ? getMediaUrl(preview) : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 backdrop-blur-md animate-fadeIn">
        <div className="flex w-full max-w-lg max-h-[92dvh] flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-red-900/30 bg-slate-950 shadow-[0_0_40px_rgba(220,38,38,0.25)] transition-all">
          {/* Header Banner */}
          <div className="relative shrink-0 h-20 sm:h-24 bg-gradient-to-r from-red-950/80 via-slate-900 to-blue-950/80 border-b border-red-900/20 p-4 sm:p-5 flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <SpideyLogo size={26} className="sm:w-7 sm:h-7" />
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-wider">Web Identity</h2>
                <p className="text-[10px] sm:text-[11px] text-blue-400 font-semibold tracking-wide">@{currentUser.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 sm:p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-1 flex-col p-4 sm:p-6 space-y-4 sm:space-y-5 -mt-8 sm:-mt-10 overflow-y-auto">
            {/* Large Avatar Section */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="relative group">
                <div 
                  className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-4 ring-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.5)] group-hover:ring-blue-500 transition-all duration-300"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to upload new picture"
                >
                  {preview ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-black text-red-400">
                      {(firstName || currentUser.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 opacity-0 group-hover:opacity-100 transition duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white mb-0.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <span className="text-[10px] font-bold text-white tracking-wide">Change Photo</span>
                  </div>
                </div>

                {/* View Large Avatar Button */}
                {preview && (
                  <button
                    type="button"
                    onClick={() => setIsAvatarZoomOpen(true)}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 border-2 border-slate-950 text-white hover:bg-blue-500 shadow-md transition active:scale-95 cursor-pointer"
                    title="View Full Size Avatar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      <line x1="11" y1="8" x2="11" y2="14"></line>
                      <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                  </button>
                )}
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold underline underline-offset-2 transition cursor-pointer"
                >
                  Upload New Avatar
                </button>
                {preview && (
                  <>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setIsAvatarZoomOpen(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 transition cursor-pointer"
                    >
                      View Full Size
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-red-400">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Peter"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-red-400">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Parker"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                />
              </div>
            </div>

            {/* Bio Field */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-blue-400">Hero Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your Web-Verse allies about yourself, your hero abilities, or your mission..."
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 leading-relaxed"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="border-t border-red-900/20 bg-slate-900/40 p-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition hover:from-red-500 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              {isSaving ? "Saving Identity..." : "Save Spidey Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* Avatar Full-Screen Viewer */}
      {preview && (
        <ImageModal
          isOpen={isAvatarZoomOpen}
          onClose={() => setIsAvatarZoomOpen(false)}
          imageUrl={avatarUrl}
        />
      )}
    </>
  );
};

export default ProfileModal;

