import { useState } from "react";
import {
  useSelector,
  useDispatch,
  shallowEqual,
} from "react-redux";

import { setActiveConversation, removeConversation } from "../../features/conversations/conversationSlice";
import { deleteConversation, leaveGroupConversation } from "../../features/conversations/conversationApi";

import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";
import TypingIndicator from "./TypingIndicator";

import useChatSocket from "../../hooks/useChatSocket";
import { getMediaUrl } from "../../services/api";
import { uploadMessageImage } from "../../features/messages/messageApi";
import UserProfileModal from "./UserProfileModal";
import SpideyLogo from "../common/SpideyLogo";

const ChatWindow = () => {
  const dispatch = useDispatch();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const activeConversationId = useSelector(
    (state) =>
      state.conversations.activeConversationId,
  );

  const currentUser = useSelector(
    (state) => state.auth.user,
  );

  const accessToken = useSelector(
    (state) => state.auth.accessToken,
  );

  const firstConversationId = useSelector(
    (state) => state.conversations.items[0]?.id,
  );

  const effectiveConversationId = activeConversationId || firstConversationId;

  const conversation = useSelector(
    (state) =>
      state.conversations.items.find(
        (item) =>
          item.id === activeConversationId,
      ),
  );

  const typingUsers = useSelector(
    (state) => {
      const users =
        state.messages.byConversation[
          activeConversationId
        ]?.typingUsers ?? {};

      return Object.values(users);
    },
    shallowEqual,
  );

  const {
    connectionState,
    isConnected,
    isReconnecting,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
  } = useChatSocket(
    effectiveConversationId,
    accessToken,
    currentUser?.id,
  );


  /* No conversation selected */
  if (!conversation) {
    return (
      <section className="hidden flex-1 items-center justify-center md:flex h-full spidey-web-bg relative">
        <div className="text-center p-8 rounded-3xl border border-red-900/20 bg-slate-950/60 backdrop-blur-md shadow-2xl max-w-md">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 ring-4 ring-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.4)] mb-4">
            <SpideyLogo size={44} />
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-300 to-blue-400 uppercase">
            Spidey Web-Net
          </h1>

          <p className="mt-2 text-xs font-medium text-slate-400">
            Select a conversation from the web sidebar to begin messaging your allies.
          </p>
        </div>
      </section>
    );
  }

  const handleBack = () => {
    dispatch(setActiveConversation(null));
  };

  const handleDeleteConversation = async () => {
    if (!activeConversationId) return;
    if (window.confirm("Are you sure you want to sever this web connection?")) {
      try {
        await deleteConversation(activeConversationId);
        dispatch(removeConversation(activeConversationId));
      } catch (err) {
        console.error("Failed to delete conversation", err);
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeConversationId) return;
    if (window.confirm("Are you sure you want to leave this web group?")) {
      try {
        await leaveGroupConversation(activeConversationId);
        dispatch(removeConversation(activeConversationId));
      } catch (err) {
        console.error("Failed to leave group", err);
      }
    }
  };

  const members = conversation.members ?? [];

  const otherMember = members.find(
    (member) => member.user_id !== currentUser?.id,
  );

  const title =
    conversation.type === "GROUP"
      ? conversation.name || "Unnamed group"
      : otherMember
        ? [otherMember.first_name, otherMember.last_name]
          .filter(Boolean)
          .join(" ") || otherMember.username
        : "Conversation";

  const handleSendImage = async (file, content) => {
    if (!activeConversationId) return;
    await uploadMessageImage(activeConversationId, file, content);
  };

  return (
    <section className="relative flex h-full flex-1 flex-col spidey-web-bg overflow-hidden">
      {/* Header */}
      <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-red-900/20 bg-slate-950/80 px-4 md:px-6 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={handleBack}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:text-white border border-red-500/30"
            aria-label="Back to messages"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>

          <div
            onClick={() => {
              if (conversation.type !== "GROUP" && otherMember) {
                setIsProfileModalOpen(true);
              }
            }}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-2 ring-red-500/50 hover:ring-blue-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] transition cursor-pointer"
          >
            {conversation.type !== "GROUP" && otherMember?.profile_picture ? (
              <img
                src={getMediaUrl(otherMember.profile_picture)}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-black text-red-400">
                {title.charAt(0).toUpperCase()}
              </span>
            )}
            {isConnected && (
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            )}
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-100 flex items-center gap-2">
              {title}
            </h1>

            <p className="mt-0.5 text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {conversation.type === "GROUP"
                ? `${members.length} allies connected`
                : isReconnecting
                  ? <span className="text-amber-400 font-medium animate-pulse">Reconnecting...</span>
                  : isConnected
                  ? <span className="text-blue-400 font-medium">Web Active{otherMember?.bio ? ` • ${otherMember.bio}` : ""}</span>
                  : connectionState}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.type === "GROUP" ? (
            <button
              onClick={handleLeaveGroup}
              title="Leave Group"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/30 px-3 text-xs font-bold text-red-400 hover:bg-red-900/50 transition cursor-pointer shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12" /></svg>
              Leave Web Group
            </button>
          ) : (
            <button
              onClick={handleDeleteConversation}
              title="Delete Conversation"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/30 px-3 text-xs font-bold text-red-400 hover:bg-red-900/50 transition cursor-pointer shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
              Delete
            </button>
          )}
        </div>
      </header>

      {/* Reconnecting banner */}
      {isReconnecting && (
        <div className="flex items-center justify-center gap-2 bg-amber-950/50 border-b border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-300 animate-pulse">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"></div>
          Reconnecting to Web-Net...
        </div>
      )}

      {/* Messages */}
      <MessageList
        conversationId={
          activeConversationId
        }
        canMarkMessagesRead={
          isConnected
        }
        onMessageRead={
          markMessageAsRead
        }
        isGroup={conversation.type === "GROUP"}
      />

      {/* Typing indicator */}
      <TypingIndicator
        users={typingUsers}
      />

      {/* Composer */}
      <MessageComposer
        onSend={sendMessage}
        onSendImage={handleSendImage}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
        disabled={!isConnected}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={otherMember}
      />
    </section>
  );
};

export default ChatWindow;