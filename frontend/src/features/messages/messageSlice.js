import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  byConversation: {},

  isLoading: false,
  isLoadingMore: false,

  error: null,
};

const createConversationState = () => ({
  items: [],
  nextCursor: null,
  hasMore: false,
  initialized: false,

  onlineUsers: {},
  typingUsers: {},
});

const getConversationState = (
  state,
  conversationId,
) => {
  return (
    state.byConversation[conversationId] ??
    (state.byConversation[conversationId] =
      createConversationState())
  );
};

const normalizeReadBy = (readBy) => {
  if (!readBy) {
    return {};
  }

  return Object.entries(readBy).reduce(
    (normalized, [key, value]) => {
      const userId = String(
        value.userId ?? value.id ?? key,
      );

      normalized[userId] = {
        userId,
        username: value.username,
        readAt:
          value.readAt ??
          value.read_at,
      };

      return normalized;
    },
    {},
  );
};

const normalizeMessage = (message) => ({
  ...message,

  // Preserve existing status or default to "sent"
  status: message.status || "sent",

  readBy: normalizeReadBy(
    message.readBy ?? message.read_by,
  ),
});

const messageSlice = createSlice({
  name: "messages",

  initialState,

  reducers: {
    fetchMessagesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    fetchMessagesSuccess: (
      state,
      action,
    ) => {
      const {
        conversationId,
        results,
        nextCursor,
        hasMore,
      } = action.payload;

      const existing =
        state.byConversation[
          conversationId
        ];

      state.byConversation[
        conversationId
      ] = {
        items: [...results].reverse().map(
          normalizeMessage,
        ),

        nextCursor,
        hasMore,
        initialized: true,

        onlineUsers:
          existing?.onlineUsers ?? {},

        typingUsers:
          existing?.typingUsers ?? {},
      };

      state.isLoading = false;
      state.error = null;
    },

    fetchMessagesFailure: (
      state,
      action,
    ) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    loadMoreMessagesStart: (
      state,
    ) => {
      state.isLoadingMore = true;
      state.error = null;
    },

    loadMoreMessagesSuccess: (
      state,
      action,
    ) => {
      const {
        conversationId,
        results,
        nextCursor,
        hasMore,
      } = action.payload;

      const conversation =
        getConversationState(
          state,
          conversationId,
        );

      const olderItems = [...results].reverse().map(
        normalizeMessage,
      );

      conversation.items = [
        ...olderItems,
        ...conversation.items,
      ];


      conversation.nextCursor =
        nextCursor;

      conversation.hasMore =
        hasMore;

      conversation.initialized =
        true;

      state.isLoadingMore = false;
      state.error = null;
    },

    loadMoreMessagesFailure: (
      state,
      action,
    ) => {
      state.isLoadingMore = false;
      state.error = action.payload;
    },

    addMessage: (
      state,
      action,
    ) => {
      const {
        conversationId,
        message,
      } = action.payload;

      const conversation =
        getConversationState(
          state,
          conversationId,
        );

      const alreadyExists =
        conversation.items.some(
          (item) =>
            String(item.id) ===
            String(message.id),
        );

      if (!alreadyExists) {
        conversation.items.push(
          normalizeMessage(message),
        );
      }
    },

    /**
     * Optimistic send: add a message with status "sending" and a temp ID.
     */
    addOptimisticMessage: (
      state,
      action,
    ) => {
      const {
        conversationId,
        message,
      } = action.payload;

      const conversation =
        getConversationState(
          state,
          conversationId,
        );

      conversation.items.push({
        ...message,
        status: "sending",
        readBy: {},
      });
    },

    /**
     * Replace the optimistic (temp) message with the confirmed server message.
     */
    replaceOptimisticMessage: (
      state,
      action,
    ) => {
      const {
        conversationId,
        tempId,
        confirmedMessage,
      } = action.payload;

      const conversation =
        state.byConversation[
          conversationId
        ];

      if (!conversation) return;

      const index =
        conversation.items.findIndex(
          (item) =>
            String(item.id) ===
            String(tempId),
        );

      if (index !== -1) {
        conversation.items[index] =
          normalizeMessage({
            ...confirmedMessage,
            status: "sent",
          });
      }
    },

    /**
     * Mark an optimistic message as failed.
     */
    markMessageFailed: (
      state,
      action,
    ) => {
      const {
        conversationId,
        tempId,
      } = action.payload;

      const conversation =
        state.byConversation[
          conversationId
        ];

      if (!conversation) return;

      const message =
        conversation.items.find(
          (item) =>
            String(item.id) ===
            String(tempId),
        );

      if (message) {
        message.status = "failed";
      }
    },

    updateMessage: (
      state,
      action,
    ) => {
      const {
        conversationId,
        message,
      } = action.payload;

      const conversation =
        state.byConversation[
          conversationId
        ];

      if (!conversation) {
        return;
      }

      const index =
        conversation.items.findIndex(
          (item) =>
            String(item.id) ===
            String(message.id),
        );

      if (index !== -1) {
        conversation.items[index] = {
          ...conversation.items[index],
          ...message,
        };
      }
    },

    removeMessage: (
      state,
      action,
    ) => {
      const {
        conversationId,
        messageId,
      } = action.payload;

      const conversation =
        state.byConversation[
          conversationId
        ];

      if (!conversation) {
        return;
      }

      conversation.items =
        conversation.items.filter(
          (item) =>
            String(item.id) !==
            String(messageId),
        );
    },

    markMessageRead: (
      state,
      action,
    ) => {
      const {
        conversationId,
        messageId,
        userId,
        username,
        readAt,
      } = action.payload;

      const conversation =
        state.byConversation[
          conversationId
        ];

      if (!conversation) {
        return;
      }

      const message =
        conversation.items.find(
          (item) =>
            String(item.id) ===
            String(messageId),
        );

      if (!message) {
        return;
      }

      if (!message.readBy) {
        message.readBy = {};
      }

      message.readBy[
        String(userId)
      ] = {
        userId: String(userId),
        username,
        readAt,
      };
    },

    setUserPresence: (
      state,
      action,
    ) => {
      const {
        conversationId,
        user,
      } = action.payload;

      const conversation =
        getConversationState(
          state,
          conversationId,
        );

      if (user.online) {
        conversation.onlineUsers[
          user.id
        ] = user;

        return;
      }

      delete conversation.onlineUsers[
        user.id
      ];
    },

    removeUserPresence: (
      state,
      action,
    ) => {
      const {
        conversationId,
        userId,
      } = action.payload;

      const conversation =
        state.byConversation[
          conversationId
        ];

      if (!conversation) {
        return;
      }

      delete conversation.onlineUsers[
        userId
      ];
    },

    setUserTyping: (
      state,
      action,
    ) => {
      const {
        conversationId,
        user,
      } = action.payload;

      const conversation =
        getConversationState(
          state,
          conversationId,
        );

      if (user.is_typing) {
        conversation.typingUsers[
          user.id
        ] = {
          ...user,
          // Timestamp when we received this typing event — used for auto-expiry
          _typingAt: Date.now(),
        };
      } else {
        delete conversation.typingUsers[
          user.id
        ];
      }
    },

    /**
     * Auto-expire stale typing indicators.
     * Called periodically from the hook; removes entries older than `maxAge` ms.
     */
    expireStaleTypingUsers: (
      state,
      action,
    ) => {
      const {
        conversationId,
        maxAge,
      } = action.payload;

      const conversation =
        state.byConversation[
          conversationId
        ];

      if (!conversation) return;

      const now = Date.now();
      for (const userId of Object.keys(conversation.typingUsers)) {
        const entry = conversation.typingUsers[userId];
        if (entry._typingAt && now - entry._typingAt > maxAge) {
          delete conversation.typingUsers[userId];
        }
      }
    },

    clearConversationPresence: (
      state,
      action,
    ) => {
      const conversation =
        state.byConversation[
          action.payload
        ];

      if (!conversation) {
        return;
      }

      conversation.onlineUsers = {};
      conversation.typingUsers = {};
    },

    clearMessages: (state) => {
      state.byConversation = {};
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
    },

    clearMessageError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchMessagesStart,
  fetchMessagesSuccess,
  fetchMessagesFailure,

  loadMoreMessagesStart,
  loadMoreMessagesSuccess,
  loadMoreMessagesFailure,

  addMessage,
  addOptimisticMessage,
  replaceOptimisticMessage,
  markMessageFailed,

  updateMessage,
  removeMessage,

  markMessageRead,

  setUserPresence,
  removeUserPresence,
  setUserTyping,
  expireStaleTypingUsers,

  clearConversationPresence,

  clearMessages,
  clearMessageError,
} = messageSlice.actions;

export default messageSlice.reducer;
