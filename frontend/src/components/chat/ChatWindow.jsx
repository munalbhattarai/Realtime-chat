import { useState, useCallback, useEffect, useRef } from "react";
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
import VideoCallOverlay from "./VideoCallOverlay";

import useChatSocket from "../../hooks/useChatSocket";
import useWebRTC from "../../hooks/useWebRTC";
import { getMediaUrl } from "../../services/api";
import { uploadMessageImage } from "../../features/messages/messageApi";
import UserProfileModal from "./UserProfileModal";
import SpideyLogo from "../common/SpideyLogo";
import ConfirmModal from "../common/ConfirmModal";
import { useToast } from "../common/ToastContext";

const ChatWindow = () => {
  const dispatch = useDispatch();
  const { showSuccess, showError } = useToast();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close 3-dot menu on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

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

  const effectiveConversationId = activeConversationId || firstConversationId || "user";

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

  // ── Stable wrapper for call events (solves circular dep: webrtc needs socketRef, chatSocket needs callHandler) ──
  const callHandlerRef = useState(() => ({ current: null }))[0];
  const stableCallEventHandler = useCallback(
    (event) => callHandlerRef.current?.(event),
    [callHandlerRef],
  );

  const {
    connectionState,
    isConnected,
    isReconnecting,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    socketRef,
  } = useChatSocket(
    effectiveConversationId,
    accessToken,
    currentUser?.id,
    stableCallEventHandler,
  );

  // ── WebRTC hook ───────────────────────────────────────────────────
  const webrtc = useWebRTC({
    socketRef,
    currentUserId: currentUser?.id,
  });

  // Wire the call event handler now that webrtc is available
  callHandlerRef.current = webrtc.onCallEvent;


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

  const handleConfirmDeleteConversation = async () => {
    if (!activeConversationId) return;
    setIsActionLoading(true);
    try {
      await deleteConversation(activeConversationId);
      dispatch(removeConversation(activeConversationId));
      showSuccess("Web link severed.");
      setIsDeleteModalOpen(false);
    } catch (err) {
      showError("Failed to delete conversation.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmLeaveGroup = async () => {
    if (!activeConversationId) return;
    setIsActionLoading(true);
    try {
      await leaveGroupConversation(activeConversationId);
      dispatch(removeConversation(activeConversationId));
      showSuccess("Successfully left the group.");
      setIsLeaveModalOpen(false);
    } catch (err) {
      showError("Failed to leave group.");
    } finally {
      setIsActionLoading(false);
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
      <header className="flex h-[68px] sm:h-[73px] shrink-0 items-center justify-between border-b border-red-900/20 bg-slate-950/80 px-3 sm:px-6 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            onClick={handleBack}
            className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-slate-300 hover:text-white border border-red-500/40 active:scale-95 transition"
            aria-label="Back to messages"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>

          <div
            onClick={() => {
              if (conversation.type !== "GROUP" && otherMember) {
                setIsProfileModalOpen(true);
              }
            }}
            className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-2 ring-red-500/50 hover:ring-blue-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] transition cursor-pointer"
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
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 ring-2 ring-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-[15px] font-bold text-slate-100 truncate max-w-[130px] sm:max-w-xs">
              {title}
            </h1>

            <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400 truncate max-w-[120px] sm:max-w-xs">
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

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Video Call button — outside three-dot menu */}
          {conversation.type === "PRIVATE" && (
            <button
              onClick={() => webrtc.startCall(activeConversationId)}
              disabled={webrtc.callState !== "idle"}
              title="Start Video Call"
              className="flex h-8 sm:h-9 items-center gap-1 sm:gap-1.5 rounded-xl border border-blue-500/30 bg-blue-950/30 px-2 sm:px-3 text-xs font-bold text-blue-400 hover:bg-blue-900/50 hover:border-blue-400/50 transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <span className="hidden xs:inline">Call</span>
            </button>
          )}

          {/* Three-dot Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              title="More options"
              aria-label="More options"
              className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 text-slate-300 hover:text-white hover:border-red-500/40 hover:bg-slate-800 transition cursor-pointer shadow-sm active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="12" cy="5" r="1.75" />
                <circle cx="12" cy="19" r="1.75" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-48 sm:w-52 rounded-2xl border border-red-900/40 bg-slate-950/95 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(239,68,68,0.15)] backdrop-blur-xl animate-fadeIn">
                {conversation.type !== "GROUP" && otherMember && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 hover:text-white transition text-left cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4 text-blue-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    View Ally Profile
                  </button>
                )}

                {conversation.type === "GROUP" ? (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsLeaveModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/50 hover:text-red-300 transition text-left cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4 text-red-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12" />
                    </svg>
                    Leave Alliance
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/50 hover:text-red-300 transition text-left cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4 text-red-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    Sever Web Link
                  </button>
                )}
              </div>
            )}
          </div>
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
        disabled={false}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={otherMember}
      />

      {/* Sever Conversation Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteConversation}
        isLoading={isActionLoading}
        title="Sever Web Link"
        message="Are you sure you want to sever this web connection? This conversation will be removed from your active web."
        confirmText="Sever Connection"
        cancelText="Keep Connected"
        isDanger={true}
      />

      {/* Leave Group Confirmation Modal */}
      <ConfirmModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleConfirmLeaveGroup}
        isLoading={isActionLoading}
        title="Leave Web Alliance"
        message="Are you sure you want to leave this web alliance group? You will no longer receive updates from this alliance."
        confirmText="Leave Alliance"
        cancelText="Stay in Alliance"
        isDanger={true}
      />

      {/* Video Call Overlay */}
      <VideoCallOverlay
        callState={webrtc.callState}
        callerInfo={webrtc.callerInfo}
        otherUserName={otherMember
          ? [otherMember.first_name, otherMember.last_name].filter(Boolean).join(" ") || otherMember.username
          : "User"}
        isMuted={webrtc.isMuted}
        isCameraOff={webrtc.isCameraOff}
        callDuration={webrtc.callDuration}
        errorMessage={webrtc.errorMessage}
        localVideoRef={webrtc.localVideoRef}
        remoteVideoRef={webrtc.remoteVideoRef}
        onAccept={webrtc.acceptCall}
        onReject={webrtc.rejectCall}
        onEnd={webrtc.endCall}
        onToggleMute={webrtc.toggleMute}
        onToggleCamera={webrtc.toggleCamera}
        onDismiss={() => webrtc.cleanup("idle")}
      />
    </section>
  );
};

export default ChatWindow;