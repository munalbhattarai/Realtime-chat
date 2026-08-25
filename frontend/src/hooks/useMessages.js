import {
  useCallback,
} from "react";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
} from "../features/messages/messageApi";

import {
  fetchMessagesStart,
  fetchMessagesSuccess,
  fetchMessagesFailure,

  loadMoreMessagesStart,
  loadMoreMessagesSuccess,
  loadMoreMessagesFailure,

  addMessage,
  updateMessage as updateMessageState,
  removeMessage,
} from "../features/messages/messageSlice";

export const useMessages = (
  conversationId,
) => {
  const dispatch = useDispatch();

  const conversationState =
    useSelector(
      (state) =>
        state.messages.byConversation[
          conversationId
        ],
    );

  const isLoading = useSelector(
    (state) =>
      state.messages.isLoading,
  );

  const isLoadingMore = useSelector(
    (state) =>
      state.messages.isLoadingMore,
  );

  const error = useSelector(
    (state) =>
      state.messages.error,
  );

  const messages =
    conversationState?.items ?? [];

  const nextCursor =
    conversationState?.nextCursor ??
    null;

  const hasMore =
    conversationState?.hasMore ??
    false;

  const initialized =
    conversationState?.initialized ??
    false;

  const fetchInitial = useCallback(
    async () => {
      if (!conversationId) {
        return;
      }

      dispatch(fetchMessagesStart());

      try {
        const data =
          await getMessages(
            conversationId,
          );

        dispatch(
          fetchMessagesSuccess({
            conversationId,
            results:
              data.results ?? [],
            nextCursor:
              data.next_cursor ?? null,
            hasMore:
              data.next_cursor !==
              null,
          }),
        );

        return data;
      } catch (error) {
        const message =
          error.response?.data?.detail ||
          "Failed to load messages.";

        dispatch(
          fetchMessagesFailure(
            message,
          ),
        );

        throw error;
      }
    },
    [conversationId, dispatch],
  );

  const fetchMore = useCallback(
    async () => {
      if (
        !conversationId ||
        !nextCursor ||
        isLoadingMore
      ) {
        return;
      }

      dispatch(
        loadMoreMessagesStart(),
      );

      try {
        const data =
          await getMessages(
            conversationId,
            nextCursor,
          );

        dispatch(
          loadMoreMessagesSuccess({
            conversationId,
            results:
              data.results ?? [],
            nextCursor:
              data.next_cursor ?? null,
            hasMore:
              data.next_cursor !==
              null,
          }),
        );

        return data;
      } catch (error) {
        const message =
          error.response?.data?.detail ||
          "Failed to load more messages.";

        dispatch(
          loadMoreMessagesFailure(
            message,
          ),
        );

        throw error;
      }
    },
    [
      conversationId,
      nextCursor,
      isLoadingMore,
      dispatch,
    ],
  );

  const sendMessage = useCallback(
    async (content) => {
      if (!conversationId) {
        return;
      }

      const trimmedContent =
        content.trim();

      if (!trimmedContent) {
        return;
      }

      const message =
        await createMessage(
          conversationId,
          trimmedContent,
        );

      dispatch(
        addMessage({
          conversationId,
          message,
        }),
      );

      return message;
    },
    [conversationId, dispatch],
  );

  const editMessage = useCallback(
    async (
      messageId,
      content,
    ) => {
      // Optimistic update: immediately update local Redux state
      dispatch(
        updateMessageState({
          conversationId,
          message: {
            id: messageId,
            content,
            updated_at: new Date().toISOString(),
          },
        }),
      );

      try {
        await updateMessage(
          messageId,
          content,
        );
      } catch (error) {
        console.error("Failed to update message on backend:", error);
      }
    },
    [conversationId, dispatch],
  );

  const removeMessageById =
    useCallback(
      async (messageId) => {
        // Optimistic update: immediately remove from local Redux state
        dispatch(
          removeMessage({
            conversationId,
            messageId,
          }),
        );

        try {
          await deleteMessage(
            messageId,
          );
        } catch (error) {
          console.error("Failed to delete message on backend:", error);
        }
      },
      [conversationId, dispatch],
    );

  return {
    messages,

    nextCursor,
    hasMore,
    initialized,

    isLoading,
    isLoadingMore,
    error,

    fetchInitial,
    fetchMore,

    sendMessage,
    editMessage,
    removeMessage:
      removeMessageById,
  };
};