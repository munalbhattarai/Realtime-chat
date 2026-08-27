import { useState, useEffect, useCallback } from "react";
import {
  searchUsers,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
} from "../../features/auth/authApi";
import { useConversations } from "../../hooks/useConversations";
import { getMediaUrl } from "../../services/api";
import SpideyLogo from "../common/SpideyLogo";
import { useToast } from "../common/ToastContext";

const NewConversationModal = ({ isOpen, onClose, initialTab = "add" }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab); // "add" | "requests" | "group"

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Friend requests state
  const [friendRequests, setFriendRequests] = useState({ received: [], sent: [], pending_count: 0 });
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Group chat state
  const [groupName, setGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const { conversations, createGroup, selectConversation, fetchAll } = useConversations();

  // Load friend requests
  const loadRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const data = await getFriendRequests();
      setFriendRequests(data);
    } catch (err) {
      console.error("Failed to load friend requests:", err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  // Reset/sync on modal open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setQuery("");
      setSearchResults([]);
      setSearchError(null);
      setGroupName("");
      setSelectedGroupUsers([]);
      loadRequests();
    }
  }, [isOpen, initialTab, loadRequests]);

  // Debounced exact username search
  useEffect(() => {
    const trimmed = query.trim().lstrip ? query.trim().lstrip("@") : query.trim().replace(/^@/, "");
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const res = await searchUsers(trimmed);
        setSearchResults(res.results || res);
      } catch (err) {
        setSearchError("Failed to search user across Web-Net.");
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  // Handle Send Friend Request
  const handleSendRequest = async (user) => {
    setActionLoadingId(user.id);
    try {
      await sendFriendRequest({ userId: user.id });
      showSuccess(`Add request sent to @${user.username}!`);
      // Update status locally
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, friendship_status: "PENDING_SENT" } : u
        )
      );
      loadRequests();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to send add request.";
      showError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Accept Friend Request
  const handleAcceptRequest = async (requestId, username) => {
    setActionLoadingId(requestId);
    try {
      const data = await acceptFriendRequest(requestId);
      showSuccess(`Connected with @${username}! You can now chat.`);
      loadRequests();
      if (data.conversation?.id) {
        fetchAll();
        selectConversation(data.conversation.id);
        onClose();
      }
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to accept add request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Friend Request
  const handleRejectRequest = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      await rejectFriendRequest(requestId);
      showInfo("Add request declined.");
      loadRequests();
    } catch (err) {
      showError("Failed to decline request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Cancel Sent Request
  const handleCancelRequest = async (requestId, userId) => {
    setActionLoadingId(requestId || userId);
    try {
      await cancelFriendRequest(requestId);
      showInfo("Add request cancelled.");
      // Update in search results if present
      if (userId) {
        setSearchResults((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, friendship_status: "NONE", friend_request_id: null } : u
          )
        );
      }
      loadRequests();
    } catch (err) {
      showError("Failed to cancel request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Create Group Chat
  const handleCreateGroup = async () => {
    if (selectedGroupUsers.length === 0) return;
    setIsCreatingGroup(true);
    try {
      const conv = await createGroup(
        groupName.trim() || `Alliance with ${selectedGroupUsers.length} Allies`,
        selectedGroupUsers.map((u) => u.id)
      );
      showSuccess("Web alliance created!");
      fetchAll();
      selectConversation(conv.id);
      onClose();
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to create alliance group.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Extract list of all connected allies from existing private conversations
  const connectedAllies = conversations
    .filter((c) => c.type === "PRIVATE")
    .map((c) => {
      const ally = c.members?.find((m) => m.username !== c.currentUserUsername);
      return ally ? { id: ally.user_id, username: ally.username, first_name: ally.first_name, last_name: ally.last_name, profile_picture: ally.profile_picture, conversationId: c.id } : null;
    })
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-fadeIn">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-red-900/30 bg-slate-950 shadow-[0_0_40px_rgba(220,38,38,0.25)] transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-900/20 bg-slate-900/50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <SpideyLogo size={28} />
            <div>
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wider">
                Web Connections
              </h2>
              <p className="text-[10px] text-blue-400 font-semibold tracking-wide">WEB-NET SECURE ALLIANCES</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-red-900/20 bg-slate-950 px-4 pt-2">
          <button
            onClick={() => setActiveTab("add")}
            className={[
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer",
              activeTab === "add"
                ? "border-red-500 text-red-400"
                : "border-transparent text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
            <span>Add Ally</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("requests");
              loadRequests();
            }}
            className={[
              "relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer",
              activeTab === "requests"
                ? "border-red-500 text-red-400"
                : "border-transparent text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>Pending Requests</span>
            {friendRequests.pending_count > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                {friendRequests.pending_count}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("group")}
            className={[
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer",
              activeTab === "group"
                ? "border-red-500 text-red-400"
                : "border-transparent text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>New Alliance</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col p-6 min-h-[320px] max-h-[440px] overflow-y-auto">
          {/* TAB 1: ADD ALLY (EXACT USERNAME SEARCH) */}
          {activeTab === "add" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-blue-400">
                  Search by Exact Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter full username (e.g. raman)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 pl-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                    autoFocus
                  />
                  <div className="absolute left-3.5 top-3.5 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Type the exact full username to send a secure Add Request.
                </p>
              </div>

              {searchError && <p className="text-sm text-red-400">{searchError}</p>}

              {/* Search Results */}
              <div className="pt-2">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
                    <p className="text-xs text-slate-400 font-medium">Scanning Web-Net for @{query.trim()}...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((user) => {
                      const displayName = user.first_name || user.last_name
                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                        : user.username;
                      const avatar = user.profile?.profile_picture ? getMediaUrl(user.profile.profile_picture) : null;
                      const status = user.friendship_status;
                      const isLoading = actionLoadingId === user.id;

                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between rounded-2xl border border-red-900/30 bg-slate-900/80 p-3.5 shadow-md transition hover:border-red-500/40"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-red-500/40 shadow-sm">
                              {avatar ? (
                                <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                              ) : (
                                <span className="font-bold text-red-400 text-sm">
                                  {displayName.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-100">{displayName}</p>
                              <p className="truncate text-[11px] text-blue-400 font-medium">@{user.username}</p>
                              {user.profile?.bio && (
                                <p className="truncate text-[10px] text-slate-400 mt-0.5 max-w-xs">{user.profile.bio}</p>
                              )}
                            </div>
                          </div>

                          {/* Action Button based on Status */}
                          <div className="shrink-0">
                            {status === "ACCEPTED" ? (
                              <button
                                onClick={() => {
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/50 transition cursor-pointer"
                              >
                                <span>Connected</span>
                              </button>
                            ) : status === "PENDING_SENT" ? (
                              <div className="flex items-center gap-1.5">
                                <span className="rounded-xl bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-400">
                                  Pending
                                </span>
                                <button
                                  onClick={() => handleCancelRequest(user.friend_request_id, user.id)}
                                  disabled={isLoading}
                                  className="rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                                  title="Cancel Request"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : status === "PENDING_RECEIVED" ? (
                              <button
                                onClick={() => handleAcceptRequest(user.friend_request_id, user.username)}
                                disabled={isLoading}
                                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 transition active:scale-95 cursor-pointer"
                              >
                                Accept
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSendRequest(user)}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_12px_rgba(220,38,38,0.4)] transition hover:from-red-500 hover:to-blue-500 active:scale-95 disabled:opacity-50 cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>{isLoading ? "Sending..." : "Add Ally"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : query.trim() ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-semibold text-slate-300">No Web Ally Found</p>
                    <p className="mt-1 text-xs text-slate-500">
                      No user found with full username "@{query.trim()}". Make sure spelling is exact.
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    <p className="text-xs">Enter full username above to search and send add requests.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PENDING REQUESTS */}
          {activeTab === "requests" && (
            <div className="space-y-5">
              {isLoadingRequests ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
                  <p className="text-xs text-slate-400">Loading requests...</p>
                </div>
              ) : (
                <>
                  {/* Incoming Requests */}
                  <div>
                    <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-red-400 flex items-center justify-between">
                      <span>Received Requests ({friendRequests.received.length})</span>
                    </h3>
                    {friendRequests.received.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2 pl-1">No incoming add requests.</p>
                    ) : (
                      <div className="space-y-2">
                        {friendRequests.received.map((req) => {
                          const sender = req.sender;
                          const displayName = sender.first_name || sender.last_name
                            ? `${sender.first_name || ""} ${sender.last_name || ""}`.trim()
                            : sender.username;
                          const avatar = sender.profile?.profile_picture ? getMediaUrl(sender.profile.profile_picture) : null;
                          const isLoading = actionLoadingId === req.id;

                          return (
                            <div
                              key={req.id}
                              className="flex items-center justify-between rounded-2xl border border-red-900/40 bg-slate-900/90 p-3 shadow-md"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-red-500/40">
                                  {avatar ? (
                                    <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="font-bold text-red-400 text-xs">
                                      {displayName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-slate-100">{displayName}</p>
                                  <p className="truncate text-[11px] text-blue-400">@{sender.username}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleAcceptRequest(req.id, sender.username)}
                                  disabled={isLoading}
                                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 transition active:scale-95 cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(req.id)}
                                  disabled={isLoading}
                                  className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/40 transition active:scale-95 cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Outgoing Requests */}
                  <div className="border-t border-red-900/20 pt-4">
                    <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-blue-400">
                      <span>Sent Requests ({friendRequests.sent.length})</span>
                    </h3>
                    {friendRequests.sent.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2 pl-1">No pending sent requests.</p>
                    ) : (
                      <div className="space-y-2">
                        {friendRequests.sent.map((req) => {
                          const receiver = req.receiver;
                          const displayName = receiver.first_name || receiver.last_name
                            ? `${receiver.first_name || ""} ${receiver.last_name || ""}`.trim()
                            : receiver.username;
                          const avatar = receiver.profile?.profile_picture ? getMediaUrl(receiver.profile.profile_picture) : null;
                          const isLoading = actionLoadingId === req.id;

                          return (
                            <div
                              key={req.id}
                              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-blue-500/40">
                                  {avatar ? (
                                    <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="font-bold text-blue-400 text-xs">
                                      {displayName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-slate-200">{displayName}</p>
                                  <p className="truncate text-[11px] text-slate-400">@{receiver.username}</p>
                                </div>
                              </div>

                              <button
                                onClick={() => handleCancelRequest(req.id)}
                                disabled={isLoading}
                                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 hover:border-red-900 transition active:scale-95 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: GROUP ALLIANCE */}
          {activeTab === "group" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-red-400">
                  Alliance Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spider-Verse Avengers..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-blue-400">
                  Select Connected Allies ({selectedGroupUsers.length} selected)
                </label>

                {connectedAllies.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No connected allies yet. Add allies first to create an alliance group.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {connectedAllies.map((ally) => {
                      const isSelected = selectedGroupUsers.some((u) => u.id === ally.id);
                      return (
                        <button
                          key={ally.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroupUsers((prev) => prev.filter((u) => u.id !== ally.id));
                            } else {
                              setSelectedGroupUsers((prev) => [...prev, ally]);
                            }
                          }}
                          className={[
                            "flex w-full items-center justify-between rounded-2xl p-2.5 text-left border transition cursor-pointer",
                            isSelected
                              ? "border-red-500/50 bg-red-950/30"
                              : "border-transparent bg-slate-900/60 hover:bg-slate-900 hover:border-slate-800",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-red-500/40">
                              {ally.profile_picture ? (
                                <img src={getMediaUrl(ally.profile_picture)} alt={ally.username} className="h-full w-full object-cover" />
                              ) : (
                                <span className="font-bold text-red-400 text-xs">
                                  {(ally.first_name || ally.username).charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-100">{ally.first_name ? `${ally.first_name} ${ally.last_name || ""}`.trim() : ally.username}</p>
                              <p className="text-[11px] text-blue-400">@{ally.username}</p>
                            </div>
                          </div>

                          <div
                            className={[
                              "flex h-5 w-5 items-center justify-center rounded-full border transition",
                              isSelected ? "border-red-500 bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "border-slate-700",
                            ].join(" ")}
                          >
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedGroupUsers.length > 0 && (
                <button
                  onClick={handleCreateGroup}
                  disabled={isCreatingGroup}
                  className="w-full rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition hover:from-red-500 hover:to-blue-500 active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingGroup ? "Spinning Web Alliance..." : `Create Alliance with ${selectedGroupUsers.length} Allies`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;
