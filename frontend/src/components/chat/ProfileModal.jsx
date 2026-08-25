import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateCurrentUser } from "../../features/auth/authApi";
import { setUser } from "../../features/auth/authSlice";
import { getMediaUrl } from "../../services/api";
import SpideyLogo from "../common/SpideyLogo";

const ProfileModal = ({ isOpen, onClose }) => {
  const currentUser = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  const [bio, setBio] = useState(currentUser?.profile?.bio || "");
  const [firstName, setFirstName] = useState(currentUser?.first_name || "");
  const [lastName, setLastName] = useState(currentUser?.last_name || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentUser?.profile?.profile_picture || null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
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
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update web profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-red-900/30 bg-slate-950 shadow-[0_0_30px_rgba(220,38,38,0.25)] transition-all">
        <div className="flex items-center justify-between border-b border-red-900/20 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2.5">
            <SpideyLogo size={26} />
            <h2 className="text-lg font-bold text-slate-100">Web Identity</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-red-950/40 hover:text-white"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col p-5 space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-4 ring-red-500/50 hover:ring-blue-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:opacity-90 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img
                  src={getMediaUrl(preview)}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-red-400">
                  {(firstName || currentUser.username).charAt(0).toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 hover:opacity-100 transition">
                <span className="text-xs font-bold text-white tracking-wide">Upload Avatar</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <p className="text-[11px] text-blue-400 font-semibold">Click avatar to change picture</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-red-400">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-red-400">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-blue-400">Hero Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your Web-Verse allies about yourself..."
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="border-t border-red-900/20 bg-slate-900/30 p-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition hover:from-red-500 hover:to-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving Identity..." : "Save Spidey Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
