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