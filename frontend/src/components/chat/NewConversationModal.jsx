import { useState, useEffect } from "react";
import { searchUsers } from "../../features/auth/authApi";
import { useConversations } from "../../hooks/useConversations";
import { getMediaUrl } from "../../services/api";
import SpideyLogo from "../common/SpideyLogo";

const NewConversationModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");

  const { createPrivate, createGroup, selectConversation } = useConversations();

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
      setSelectedUsers([]);
      setGroupName("");
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);
      try {
        const users = await searchUsers(query.trim());
        setResults(users.results || users);
      } catch (err) {
        setError("Failed to search users across Web-Net.");
      } finally {
        setIsSearching(false);
      }
    }, 400); // debounce

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const toggleUserSelection = (user) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
    setQuery("");
    setResults([]);
  };

  const handleCreate = async () => {
    setError(null);
    try {
      if (selectedUsers.length === 1) {
        const conv = await createPrivate(selectedUsers[0].id);
        selectConversation(conv.id);
      } else if (selectedUsers.length > 1) {
        const conv = await createGroup(
          groupName.trim() || `Web Alliance with ${selectedUsers.length} allies`,
          selectedUsers.map((u) => u.id)
        );
        selectConversation(conv.id);
      }
      onClose();
    } catch (err) {
      setError(
        "Failed to establish connection. " +
          (err.response?.data?.user_id?.[0] || err.response?.data?.detail || "")
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-red-900/30 bg-slate-950 shadow-[0_0_30px_rgba(220,38,38,0.2)] transition-all">
        <div className="flex items-center justify-between border-b border-red-900/20 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2.5">
            <SpideyLogo size={26} />
            <h2 className="text-lg font-bold text-slate-100">
              {selectedUsers.length > 1 ? "Spin Web Alliance" : "Connect Ally"}
            </h2>
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
          {selectedUsers.length > 1 && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-red-400">
                Alliance Name (optional)
              </label>
              <input
                type="text"
                placeholder="Enter web alliance name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-blue-400">
              Search Web Allies
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by hero name or username..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 pl-10 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                autoFocus
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3.5 top-3 h-4 w-4 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/30 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-red-300 shadow-sm"
                >
                  <span className="truncate max-w-[100px]">
                    {user.first_name || user.username}
                  </span>
                  <button
                    onClick={() => toggleUserSelection(user)}
                    className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-red-800 text-red-300 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="max-h-52 overflow-y-auto pr-1">
            {isSearching ? (
              <p className="py-4 text-center text-sm text-slate-500">Searching Web-Verse...</p>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((user) => {
                  const isSelected = selectedUsers.find((u) => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUserSelection(user)}
                      className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left transition hover:bg-slate-900 border border-transparent hover:border-red-900/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-2 ring-red-500/30">
                          {user.profile?.profile_picture ? (
                            <img
                              src={getMediaUrl(user.profile.profile_picture)}
                              alt={user.username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-red-400 text-xs">
                              {user.first_name
                                ? user.first_name.charAt(0).toUpperCase()
                                : user.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-bold text-slate-100">
                            {user.first_name || user.last_name
                              ? `${user.first_name} ${user.last_name}`.trim()
                              : user.username}
                          </p>
                          <p className="truncate text-[11px] text-blue-400">
                            @{user.username}
                          </p>
                          {user.profile?.bio && (
                            <p className="truncate text-[10px] text-slate-400 mt-0.5">
                              {user.profile.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <div
                        className={["flex h-5 w-5 items-center justify-center rounded-full border transition", isSelected ? "border-red-500 bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "border-slate-700"].join(" ")}
                      >
                        {isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : query.trim() ? (
              <p className="py-4 text-center text-sm text-slate-500">No web allies found.</p>
            ) : (
              <p className="py-4 text-center text-sm text-slate-500">
                Type to search for allies.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-red-900/20 bg-slate-900/30 p-4">
          <button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0}
            className="w-full rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition hover:from-red-500 hover:to-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedUsers.length > 1 ? "Spin Web Alliance Chat" : "Establish Web Link"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;
