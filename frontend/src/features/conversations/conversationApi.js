import api from "../../services/api";

export const getConversations = async () => {
  const response = await api.get(
    "/chats/conversations/",
  );

  return response.data;
};

export const createPrivateConversation = async (
  userId,
) => {
  const response = await api.post(
    "/chats/conversations/private/",
    {
      user_id: userId,
    },
  );

  return response.data;
};

export const createGroupConversation = async (
  name,
  userIds,
) => {
  const response = await api.post(
    "/chats/conversations/group/",
    {
      name: name,
      user_ids: userIds,
    },
  );

  return response.data;
};

export const deleteConversation = async (conversationId) => {
  const response = await api.delete(
    `/chats/conversations/${conversationId}/`,
  );
  return response.data;
};

export const leaveGroupConversation = async (conversationId) => {
  const response = await api.post(
    `/chats/conversations/${conversationId}/leave/`,
  );
  return response.data;
};

export const addGroupMember = async (conversationId, userId) => {
  const response = await api.post(
    `/chats/conversations/${conversationId}/members/`,
    { user_id: userId },
  );
  return response.data;
};

export const removeGroupMember = async (conversationId, userId) => {
  const response = await api.delete(
    `/chats/conversations/${conversationId}/members/${userId}/`,
  );
  return response.data;
};