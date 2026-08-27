import api from "../../services/api";

export const registerUser = async (userData) => {
  const response = await api.post(
    "/accounts/register/",
    userData,
  );

  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post(
    "/accounts/login/",
    credentials,
  );

  return response.data;
};

export const googleAuthUser = async ({ credential }) => {
  const response = await api.post(
    "/accounts/google/",
    { credential },
  );

  return response.data;
};

export const refreshAccessToken = async (
  refreshToken,
) => {
  const response = await api.post(
    "/accounts/token/refresh/",
    {
      refresh: refreshToken,
    },
  );

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get(
    "/accounts/me/",
  );

  return response.data;
};

export const updateCurrentUser = async (
  userData,
) => {
  const isFormData = userData instanceof FormData;
  const config = isFormData
    ? { headers: { "Content-Type": undefined } }
    : {};

  const response = await api.patch(
    "/accounts/me/",
    userData,
    config
  );

  return response.data;
};

export const logoutUser = async (
  refreshToken,
) => {
  const response = await api.post(
    "/accounts/logout/",
    {
      refresh: refreshToken,
    }
  );

  return response.data;
};

export const searchUsers = async (query) => {
  const response = await api.get(
    "/accounts/search/",
    {
      params: { q: query },
    }
  );

  return response.data;
};

export const getFriendRequests = async () => {
  const response = await api.get("/accounts/friend-requests/");
  return response.data;
};

export const sendFriendRequest = async ({ userId, username }) => {
  const payload = {};
  if (userId) payload.user_id = userId;
  if (username) payload.username = username;

  const response = await api.post("/accounts/friend-requests/", payload);
  return response.data;
};

export const acceptFriendRequest = async (requestId) => {
  const response = await api.post(`/accounts/friend-requests/${requestId}/accept/`);
  return response.data;
};

export const rejectFriendRequest = async (requestId) => {
  const response = await api.post(`/accounts/friend-requests/${requestId}/reject/`);
  return response.data;
};

export const cancelFriendRequest = async (requestId) => {
  const response = await api.delete(`/accounts/friend-requests/${requestId}/cancel/`);
  return response.data;
};