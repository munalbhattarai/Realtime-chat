import {
  useCallback,
} from "react";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  createPrivateConversation,
  createGroupConversation,
  getConversations,
} from "../features/conversations/conversationApi";

import {
  createConversationFailure,
  createConversationStart,
  createConversationSuccess,

  fetchConversationsFailure,
  fetchConversationsStart,
  fetchConversationsSuccess,

  setActiveConversation,
} from "../features/conversations/conversationSlice";

export const useConversations = () => {
  const dispatch = useDispatch();

  const {
    items,
    activeConversationId,
    isLoading,
    isCreating,
    error,
  } = useSelector(
    (state) => state.conversations,
  );

  const fetchAll = useCallback(
    async () => {
      dispatch(
        fetchConversationsStart(),
      );

      try {
        const data =
          await getConversations();

        dispatch(
          fetchConversationsSuccess(
            data.results ?? data,
          ),
        );

        return data;
      } catch (error) {
        const message =
          error.response?.data?.detail ||
          "Failed to load conversations.";

        dispatch(
          fetchConversationsFailure(
            message,
          ),
        );

        throw error;
      }
    },
    [dispatch],
  );

  const createPrivate = useCallback(
    async (userId) => {
      dispatch(
        createConversationStart(),
      );

      try {
        const conversation =
          await createPrivateConversation(
            userId,
          );

        dispatch(
          createConversationSuccess(
            conversation,
          ),
        );

        return conversation;
      } catch (error) {
        const message =
          error.response?.data?.detail ||
          "Failed to create conversation.";

        dispatch(
          createConversationFailure(
            message,
          ),
        );

        throw error;
      }
    },
    [dispatch],
  );

  const createGroup = useCallback(
    async (name, userIds) => {
      dispatch(
        createConversationStart(),
      );

      try {
        const conversation =
          await createGroupConversation(
            name,
            userIds,
          );

        dispatch(
          createConversationSuccess(
            conversation,
          ),
        );

        return conversation;
      } catch (error) {
        const message =
          error.response?.data?.detail ||
          "Failed to create group conversation.";

        dispatch(
          createConversationFailure(
            message,
          ),
        );

        throw error;
      }
    },
    [dispatch],
  );

  const selectConversation =
    useCallback(
      (conversationId) => {
        dispatch(
          setActiveConversation(
            conversationId,
          ),
        );
      },
      [dispatch],
    );

  return {
    conversations: items,
    activeConversationId,

    isLoading,
    isCreating,
    error,

    fetchAll,
    createPrivate,
    createGroup,
    selectConversation,
  };
};