import {
  createSlice,
} from "@reduxjs/toolkit";

const initialState = {
  items: [],
  activeConversationId: null,

  isLoading: false,
  isCreating: false,

  error: null,
};

const conversationSlice = createSlice({
  name: "conversations",

  initialState,

  reducers: {
    fetchConversationsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    fetchConversationsSuccess: (
      state,
      action,
    ) => {
      state.items = action.payload;
      state.isLoading = false;
      state.error = null;
    },

    fetchConversationsFailure: (
      state,
      action,
    ) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    createConversationStart: (state) => {
      state.isCreating = true;
      state.error = null;
    },

    createConversationSuccess: (
      state,
      action,
    ) => {
      const conversation = action.payload;

      const existingIndex =
        state.items.findIndex(
          (item) =>
            item.id === conversation.id,
        );

      if (existingIndex !== -1) {
        state.items[existingIndex] =
          conversation;
      } else {
        state.items.unshift(
          conversation,
        );
      }

      state.activeConversationId =
        conversation.id;

      state.isCreating = false;
      state.error = null;
    },

    createConversationFailure: (
      state,
      action,
    ) => {
      state.isCreating = false;
      state.error = action.payload;
    },

    setActiveConversation: (
      state,
      action,
    ) => {
      state.activeConversationId =
        action.payload;

      const conversation = state.items.find(
        (item) => String(item.id) === String(action.payload)
      );

      if (conversation) {
        conversation.unread_count = 0;
      }
    },

    updateConversationMember: (
      state,
      action,
    ) => {
      const { conversationId, member } = action.payload;
      const conversation = state.items.find(
        (item) => item.id === conversationId
      );
      if (conversation) {
        const memberIndex = conversation.members.findIndex(
          (m) => String(m.user_id) === String(member.user_id)
        );
        if (memberIndex !== -1) {
          conversation.members[memberIndex] = {
            ...conversation.members[memberIndex],
            ...member,
          };
        }
      }
    },

    // Updates a member's profile across ALL conversations (used after profile.update WS event)
    updateMemberAcrossAllConversations: (
      state,
      action,
    ) => {
      const { user_id, first_name, last_name, profile_picture, bio } = action.payload;
      for (const conversation of state.items) {
        const memberIndex = conversation.members.findIndex(
          (m) => String(m.user_id) === String(user_id)
        );
        if (memberIndex !== -1) {
          conversation.members[memberIndex] = {
            ...conversation.members[memberIndex],
            first_name,
            last_name,
            profile_picture,
            bio,
          };
        }
      }
    },

    bumpConversationToTop: (state, action) => {
      const { conversationId, senderId, currentUserId } = action.payload || {};
      const targetId = String(conversationId);
      const index = state.items.findIndex(
        (item) => String(item.id) === targetId
      );

      if (index !== -1) {
        const targetConv = state.items[index];
        const isOwnMessage =
          Boolean(senderId && currentUserId && String(senderId) === String(currentUserId));
        const isActive =
          Boolean(state.activeConversationId && String(state.activeConversationId) === targetId);

        const newUnreadCount = (isActive || isOwnMessage)
          ? 0
          : (targetConv.unread_count || 0) + 1;

        const updatedConv = {
          ...targetConv,
          unread_count: newUnreadCount,
        };

        state.items = [
          updatedConv,
          ...state.items.filter((item) => String(item.id) !== targetId),
        ];
      }
    },



    addOrUpdateConversation: (state, action) => {
      const conversation = action.payload;
      if (!conversation || !conversation.id) return;
      const index = state.items.findIndex(
        (item) => String(item.id) === String(conversation.id)
      );
      if (index !== -1) {
        state.items[index] = {
          ...state.items[index],
          ...conversation,
        };
      } else {
        state.items.unshift(conversation);
      }
    },

    clearActiveConversation: (state) => {
      state.activeConversationId = null;
    },

    removeConversation: (state, action) => {
      const conversationId = action.payload;
      state.items = state.items.filter((item) => item.id !== conversationId);
      if (state.activeConversationId === conversationId) {
        state.activeConversationId = null;
      }
    },

    clearConversationError: (state) => {
      state.error = null;
    },

    clearConversations: (state) => {
      state.items = [];
      state.activeConversationId = null;
      state.isLoading = false;
      state.isCreating = false;
      state.error = null;
    },
  },
});

export const {
  fetchConversationsStart,
  fetchConversationsSuccess,
  fetchConversationsFailure,

  createConversationStart,
  createConversationSuccess,
  createConversationFailure,

  setActiveConversation,
  updateConversationMember,
  updateMemberAcrossAllConversations,
  addOrUpdateConversation,
  bumpConversationToTop,
  removeConversation,
  clearActiveConversation,

  clearConversationError,
  clearConversations,
} = conversationSlice.actions;

export default conversationSlice.reducer;