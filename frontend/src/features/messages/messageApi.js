import api from "../../services/api";

export const getMessages = async (
  conversationId,
  cursor = null,
) => {
  const params = {};

  if (cursor) {
    params.cursor = cursor;
  }

  const response = await api.get(
    `/messages/conversations/${conversationId}/messages/`,
    {
      params,
    },
  );

  return response.data;
};

export const createMessage = async (
  conversationId,
  content,
) => {
  const response = await api.post(
    `/messages/conversations/${conversationId}/messages/`,
    {
      content,
    },
  );

  return response.data;
};

export const updateMessage = async (
  messageId,
  content,
) => {
  const response = await api.patch(
    `/messages/${messageId}/`,
    {
      content,
    },
  );

  return response.data;
};

export const deleteMessage = async (
  messageId,
) => {
  await api.delete(
    `/messages/${messageId}/`,
  );
};

export const uploadMessageImage = async (
  conversationId,
  file,
  content = "",
) => {
  const formData = new FormData();
  formData.append("file", file);
  if (content) {
    formData.append("content", content);
  }

  const response = await api.post(
    `/messages/conversations/${conversationId}/upload-image/`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};