import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useDispatch } from "react-redux";

import {
  addMessage,
  addOptimisticMessage,
  replaceOptimisticMessage,
  markMessageFailed,
  updateMessage,
  removeMessage,
  markMessageRead,
  setUserPresence,
  setUserTyping,
  expireStaleTypingUsers,
} from "../features/messages/messageSlice";

import { ChatWebSocket } from "../services/websocket";
import {
  bumpConversationToTop,
  updateMemberAcrossAllConversations,
  addOrUpdateConversation,
  fetchConversationsSuccess,
} from "../features/conversations/conversationSlice";
import { setUser } from "../features/auth/authSlice";
import { createMessage as createMessageApi } from "../features/messages/messageApi";
import { getConversations } from "../features/conversations/conversationApi";

/** How long before a stale typing indicator auto-expires (ms). */
const TYPING_EXPIRY_MS = 5000;
/** How often to check for stale typing indicators (ms). */
const TYPING_EXPIRY_INTERVAL_MS = 2000;

let _tempIdCounter = 0;
function generateTempId() {
  return `temp-${Date.now()}-${++_tempIdCounter}`;
}

const useChatSocket = (
  conversationId,
  token,
  currentUserId,
) => {
  const dispatch = useDispatch();

  const socketRef = useRef(null);
  const pendingOptimisticRef = useRef(new Map());

  const [
    connectionState,
    setConnectionState,
  ] = useState("disconnected");

  const handleMessage = useCallback(
    (event) => {
      switch (event.type) {
        case "connection": {
          break;
        }

        case "message.created": {
          const message = event.message;

          if (!message) {
            return;
          }

          // Check if this is a confirmation of our own optimistic message
          if (
            String(message.sender_id) === String(currentUserId) &&
            String(message.conversation_id) === String(conversationId)
          ) {
            // Find matching pending optimistic message by content + timestamp proximity
            let matchedTempId = null;
            for (const [tempId, pending] of pendingOptimisticRef.current.entries()) {
              if (
                pending.content === (message.content || "") &&
                pending.conversationId === String(message.conversation_id)
              ) {
                matchedTempId = tempId;
                break;
              }
            }

            if (matchedTempId) {
              pendingOptimisticRef.current.delete(matchedTempId);
              dispatch(
                replaceOptimisticMessage({
                  conversationId,
                  tempId: matchedTempId,
                  confirmedMessage: {
                    id: message.id,
                    conversation_id: message.conversation_id,
                    sender: message.sender_id,
                    sender_username: message.sender_username,
                    content: message.content,
                    image_url: message.image_url,
                    created_at: message.created_at,
                    updated_at: message.created_at,
                    readBy: {},
                  },
                }),
              );
              // Still bump conversation to top
              dispatch(
                bumpConversationToTop({
                  conversationId: message.conversation_id,
                  senderId: message.sender_id,
                  currentUserId,
                })
              );
              break;
            }
          }

          // If message is for the currently active conversation, add to message list
          if (
            String(message.conversation_id) === String(conversationId)
          ) {
            dispatch(
              addMessage({
                conversationId,
                message: {
                  id: message.id,
                  conversation_id: message.conversation_id,
                  sender: message.sender_id,
                  sender_username: message.sender_username,
                  content: message.content,
                  image_url: message.image_url,
                  created_at: message.created_at,
                  updated_at: message.created_at,
                  readBy: {},
                },
              }),
            );
          }

          // Always bump target conversation to top of sidebar and increment unread badge if from another user
          dispatch(
            bumpConversationToTop({
              conversationId: message.conversation_id,
              senderId: message.sender_id,
              currentUserId,
            })
          );

          // Auto-sync conversation list in case this was a message from a new conversation
          getConversations()
            .then((data) => {
              dispatch(fetchConversationsSuccess(data.results ?? data));
            })
            .catch(() => {});

          break;
        }

        case "conversation.created": {
          if (event.conversation) {
            dispatch(addOrUpdateConversation(event.conversation));
          }
          getConversations()
            .then((data) => {
              dispatch(fetchConversationsSuccess(data.results ?? data));
            })
            .catch(() => {});
          break;
        }



        case "message.updated": {
          const message = event.message;

          if (!message) {
            return;
          }

          if (
            String(message.conversation_id) !== String(conversationId)
          ) {
            return;
          }

          dispatch(
            updateMessage({
              conversationId,
              message: {
                id: message.id,
                content: message.content,
                image_url: message.image_url,
                updated_at: message.updated_at,
              },
            }),
          );

          break;
        }

        case "message.deleted": {
          const message = event.message;

          if (!message) {
            return;
          }

          if (
            String(message.conversation_id) !== String(conversationId)
          ) {
            return;
          }

          dispatch(
            removeMessage({
              conversationId,
              messageId: message.id,
            }),
          );

          break;
        }

        case "presence.update": {
          const user = event.user;

          if (!user) {
            return;
          }

          dispatch(
            setUserPresence({
              conversationId,
              user,
            }),
          );

          break;
        }

        case "typing.update": {
          const user = event.user;

          if (!user) {
            return;
          }

          dispatch(
            setUserTyping({
              conversationId,
              user,
            }),
          );

          break;
        }

        case "message.read": {
          const message = event.message;

          if (!message) {
            return;
          }

          if (
            String(message.conversation_id) !== String(conversationId)
          ) {
            return;
          }

          if (!message.read_by) {
            return;
          }

          const messageId = String(message.id);
          const userId = String(message.read_by.id);
          const username = message.read_by.username;
          const readAt = message.read_by.read_at;

          dispatch(
            markMessageRead({
              conversationId,
              messageId,
              userId,
              username,
              readAt,
            }),
          );

          break;
        }

        // Handle batch read receipts from optimized backend
        case "messages.read.batch": {
          const { message_ids, user_id, username, read_at, conversation_id } = event;

          if (!message_ids || String(conversation_id) !== String(conversationId)) {
            break;
          }

          if (String(user_id) === String(currentUserId)) {
            break;
          }

          for (const msgId of message_ids) {
            dispatch(
              markMessageRead({
                conversationId,
                messageId: String(msgId),
                userId: String(user_id),
                username,
                readAt: read_at,
              }),
            );
          }

          break;
        }

        case "profile.update": {
          const { user_id, first_name, last_name, profile_picture, bio } = event;
          // Update across ALL conversations so sidebar items and headers all reflect the new picture
          dispatch(
            updateMemberAcrossAllConversations({
              user_id,
              first_name,
              last_name,
              profile_picture,
              bio,
            })
          );
          // Also update auth.user if the updated profile belongs to the current user
          if (currentUserId && String(user_id) === String(currentUserId)) {
            dispatch(
              setUser({
                profile: { profile_picture, bio },
                first_name,
                last_name,
              })
            );
          }
          break;
        }

        case "friend_request.received": {
          const req = event.request;
          const senderUsername = req?.sender?.username || "An ally";
          window.dispatchEvent(new CustomEvent("friend_request_update"));
          window.dispatchEvent(
            new CustomEvent("spidey_toast", {
              detail: {
                title: "New Add Request",
                message: `@${senderUsername} sent you a Web-Net Add Request!`,
                type: "info",
              },
            })
          );
          break;
        }

        case "friend_request.accepted": {
          const req = event.request;
          const allyName = req?.receiver?.username || req?.sender?.username || "Ally";
          window.dispatchEvent(new CustomEvent("friend_request_update"));
          window.dispatchEvent(
            new CustomEvent("spidey_toast", {
              detail: {
                title: "Web Link Established",
                message: `You and @${allyName} are now connected allies!`,
                type: "success",
              },
            })
          );
          if (event.conversation) {
            dispatch(addOrUpdateConversation(event.conversation));
          }
          getConversations()
            .then((data) => {
              dispatch(fetchConversationsSuccess(data.results ?? data));
            })
            .catch(() => {});
          break;
        }

        case "friend_request.rejected":
        case "friend_request.cancelled": {
          window.dispatchEvent(new CustomEvent("friend_request_update"));
          break;
        }

        case "error": {
          break;
        }

        default: {
          break;
        }
      }
    },
    [conversationId, dispatch, currentUserId],
  );


  const effectiveToken = token || localStorage.getItem("access_token");

  useEffect(() => {
    if (!conversationId || !effectiveToken) {
      return;
    }

    const socket = new ChatWebSocket({
      conversationId,
      token: effectiveToken,

      onOpen: () => {
        setConnectionState("connected");
      },

      onMessage: handleMessage,

      onError: () => {
        setConnectionState("error");
      },

      onClose: () => {
        setConnectionState("disconnected");
      },

      onReconnecting: () => {
        setConnectionState("reconnecting");
      },
    });

    socketRef.current = socket;

    setConnectionState("connecting");

    socket.connect();

    return () => {
      socket.disconnect();

      socketRef.current = null;

      setConnectionState("disconnected");
    };
  }, [conversationId, effectiveToken, handleMessage]);

  // ── Typing auto-expiry timer ────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(() => {
      dispatch(
        expireStaleTypingUsers({
          conversationId,
          maxAge: TYPING_EXPIRY_MS,
        })
      );
    }, TYPING_EXPIRY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [conversationId, dispatch]);

  // ── Optimistic send with WebSocket and HTTP REST fallback ──
  const sendMessage = useCallback(async (content, imageUrl = null) => {
    if (!content?.trim() && !imageUrl) {
      return false;
    }

    const trimmedContent = content ? content.trim() : "";

    // Generate a temp ID and dispatch optimistic message immediately
    const tempId = generateTempId();

    dispatch(
      addOptimisticMessage({
        conversationId,
        message: {
          id: tempId,
          conversation_id: conversationId,
          sender: currentUserId,
          sender_username: "", // Will be filled by server confirmation
          content: trimmedContent,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    );

    // Track this pending optimistic message
    pendingOptimisticRef.current.set(tempId, {
      content: trimmedContent,
      conversationId: String(conversationId),
      timestamp: Date.now(),
    });

    const isSocketOpen = socketRef.current && socketRef.current.isConnected();

    if (isSocketOpen) {
      socketRef.current.send({
        type: "chat_message",
        content: trimmedContent,
        image_url: imageUrl,
      });
    } else {
      // WebSocket is offline or reconnecting -> Fall back to reliable HTTP REST API
      try {
        const createdMsg = await createMessageApi(conversationId, trimmedContent);
        if (createdMsg) {
          pendingOptimisticRef.current.delete(tempId);
          dispatch(
            replaceOptimisticMessage({
              conversationId,
              tempId,
              confirmedMessage: {
                id: createdMsg.id,
                conversation_id: conversationId,
                sender: createdMsg.sender,
                sender_username: createdMsg.sender_username,
                content: createdMsg.content,
                image_url: createdMsg.image_url,
                created_at: createdMsg.created_at,
                updated_at: createdMsg.updated_at || createdMsg.created_at,
                readBy: createdMsg.readBy || {},
              },
            })
          );
          dispatch(
            bumpConversationToTop({
              conversationId,
              senderId: createdMsg.sender,
              currentUserId,
            })
          );
        }
      } catch (err) {
        console.error("HTTP send fallback failed:", err);
        dispatch(
          markMessageFailed({
            conversationId,
            tempId,
          })
        );
        pendingOptimisticRef.current.delete(tempId);
        return false;
      }
    }

    // Safety timeout in case WS confirmation is delayed
    setTimeout(() => {
      if (pendingOptimisticRef.current.has(tempId)) {
        pendingOptimisticRef.current.delete(tempId);
        dispatch(
          markMessageFailed({
            conversationId,
            tempId,
          })
        );
      }
    }, 15000);

    return true;
  }, [conversationId, currentUserId, dispatch]);

  const startTyping = useCallback(() => {
    if (!socketRef.current) {
      return false;
    }

    return socketRef.current.send({
      type: "typing.start",
    });
  }, []);

  const stopTyping = useCallback(() => {
    if (!socketRef.current) {
      return false;
    }

    return socketRef.current.send({
      type: "typing.stop",
    });
  }, []);

  const markMessageAsRead = useCallback((messageId) => {
    if (!messageId) {
      return false;
    }

    if (!socketRef.current) {
      return false;
    }

    const normalizedId = String(messageId);

    return socketRef.current.send({
      type: "message.read",
      message_id: normalizedId,
    });
  }, []);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    isReconnecting: connectionState === "reconnecting",
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
  };
};

export default useChatSocket;
