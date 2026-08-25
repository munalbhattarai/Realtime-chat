import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useConversations } from "../../hooks/useConversations";
import ConversationItem from "./ConversationItem";
import NewConversationModal from "./NewConversationModal";
import ProfileModal from "./ProfileModal";
import { useAuth } from "../../hooks/useAuth";
import { getMediaUrl } from "../../services/api";
import SpideyLogo from "../common/SpideyLogo";

const ConversationSidebar = () => {
  const { logout } = useAuth();
  
  const currentUser = useSelector((state) => state.auth.user);
  
  const {
    conversations,
    activeConversationId,
    isLoading,
    fetchAll,
    selectConversation,
  } = useConversations();

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchAll();

    const handleFocus = () => {
      fetchAll();
    };

    window.addEventListener("focus", handleFocus);
    const interval = setInterval(() => {
      fetchAll();
    }, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [fetchAll]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-red-950/40 spidey-sidebar-bg md:w-80 lg:w-96 relative">
      {/* Header */}
      <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-red-900/20 bg-slate-950/70 px-6 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5">
          <SpideyLogo size={32} />
          <div>
            <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-blue-500 uppercase">
              Spidey-Chat
            </h1>
            <p className="text-[10px] text-blue-400/80 font-medium tracking-wide">WEB-NET SECURE</p>
          </div>
        </div>
        <button 
          onClick={() => setIsNewChatModalOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-950/60 ring-2 ring-red-500/40 transition hover:from-red-500 hover:to-blue-600 hover:shadow-blue-900/50 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="New chat"
          title="New Web-Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </header>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {isLoading && conversations.length === 0 ? (
          <div className="space-y-3 px-2 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-red-950/30 border border-red-900/20"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-24 rounded bg-red-950/40"></div>
                  <div className="h-3 w-32 rounded bg-blue-950/30"></div>
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900/80 border border-red-500/30 ring-4 ring-red-950/30 shadow-lg">
              <SpideyLogo size={36} />
            </div>
            <p className="text-base font-bold text-slate-200">
              No Webs Spun Yet
            </p>
            <p className="mt-1 text-xs text-slate-400 max-w-[200px]">
              Connect with allies across the Web-Verse to start messaging.
            </p>
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-6 rounded-full bg-gradient-to-r from-red-600 to-blue-600 px-6 py-2.5 text-xs font-bold tracking-wide text-white transition shadow-lg shadow-red-950/60 hover:from-red-500 hover:to-blue-500 hover:shadow-blue-950/70 hover:scale-105 active:scale-95"
            >
              Spin New Web
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={
                  conversation.id ===
                  activeConversationId
                }
                currentUserId={currentUser?.id}
                onClick={() =>
                  selectConversation(
                    conversation.id,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* User Profile Footer */}
      <footer className="mt-auto border-t border-red-900/20 bg-slate-950/80 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="group flex flex-1 items-center gap-3 rounded-xl p-2 transition hover:bg-slate-900/90 text-left border border-transparent hover:border-red-500/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-2 ring-red-500/40 group-hover:ring-blue-500 transition">
              {currentUser?.profile?.profile_picture ? (
                <img 
                  src={getMediaUrl(currentUser.profile.profile_picture)} 
                  alt={currentUser.username} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-bold text-red-400 text-sm group-hover:text-blue-300 transition">
                  {(currentUser?.username || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-bold text-slate-200 group-hover:text-white transition">
                {currentUser?.first_name || currentUser?.last_name ? `${currentUser?.first_name} ${currentUser?.last_name}`.trim() : currentUser?.username}
              </p>
              <p className="truncate text-[11px] text-slate-400 transition">
                {currentUser?.profile?.bio || "Friendly Neighborhood Hero"}
              </p>
            </div>
          </button>
          <button
            onClick={logout}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-950/20 text-slate-400 hover:bg-red-900/40 hover:text-red-300 hover:border-red-500/40 transition"
            aria-label="Logout"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </footer>

      <NewConversationModal 
        isOpen={isNewChatModalOpen} 
        onClose={() => setIsNewChatModalOpen(false)} 
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </aside>
  );
};

export default ConversationSidebar;