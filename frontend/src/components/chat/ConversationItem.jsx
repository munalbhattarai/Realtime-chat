import { memo, useState } from "react";
import { getMediaUrl } from "../../services/api";
import UserProfileModal from "./UserProfileModal";

const ConversationItem = memo(({
  conversation,
  isActive,
  currentUserId,
  onClick,
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const members = conversation.members ?? [];

  const otherMember = members.find(
    (member) => member.user_id !== currentUserId,
  );

  const displayName =
    conversation.type === "GROUP"
      ? conversation.name || "Unnamed Spider-Group"
      : otherMember
        ? [otherMember.first_name, otherMember.last_name]
            .filter(Boolean)
            .join(" ") || otherMember.username
        : "Unknown Ally";

  const profilePicture =
    conversation.type === "GROUP"
      ? null
      : otherMember?.profile_picture;

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (conversation.type !== "GROUP" && otherMember) {
      setIsProfileModalOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={[
          "group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-200 border-l-4",
          isActive
            ? "border-red-500 bg-gradient-to-r from-red-950/40 via-slate-900/90 to-blue-950/30 shadow-md shadow-red-950/40"
            : "border-transparent hover:bg-slate-900/60 hover:border-blue-500/40",
        ].join(" ")}
      >
        <div 
          onClick={handleAvatarClick}
          className={[
            "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 shadow-sm ring-2 transition-all duration-300 cursor-pointer",
            isActive ? "ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "ring-blue-900/40 group-hover:ring-blue-500/60"
          ].join(" ")}
        >
          {profilePicture ? (
            <img
              src={getMediaUrl(profilePicture)}
              alt={displayName}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className={["text-sm font-black", isActive ? "text-red-400" : "text-blue-300"].join(" ")}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className={["truncate text-sm font-bold transition-colors duration-200", isActive ? "text-red-400" : "text-slate-100 group-hover:text-white"].join(" ")}>
              {displayName}
            </p>
            {conversation.unread_count > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-1.5 text-[10px] font-black text-white shadow-sm ring-2 ring-red-400/50">
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </span>
            )}
          </div>

          <p className={["mt-0.5 truncate text-xs transition-colors", conversation.unread_count > 0 ? "text-red-400 font-semibold" : "text-slate-400 group-hover:text-slate-300"].join(" ")}>
            {conversation.type === "GROUP"
              ? `${members.length} allies in web`
              : "Direct Web Connection"}
          </p>
        </div>
      </button>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={otherMember}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render when this specific item's data changes
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.name === nextProps.conversation.name &&
    prevProps.conversation.unread_count === nextProps.conversation.unread_count &&
    prevProps.conversation.members?.length === nextProps.conversation.members?.length &&
    prevProps.conversation.updated_at === nextProps.conversation.updated_at
  );
});

ConversationItem.displayName = "ConversationItem";

export default ConversationItem;