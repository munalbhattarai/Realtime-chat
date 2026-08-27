import { useDispatch, useSelector } from "react-redux";

import {
  authFailure,
  authStart,
  loginSuccess,
  logout as logoutAction,
  setUser,
} from "../features/auth/authSlice";

import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  googleAuthUser,
} from "../features/auth/authApi";

export const useAuth = () => {
  const dispatch = useDispatch();

  const auth = useSelector(
    (state) => state.auth,
  );

  const login = async (credentials) => {
    dispatch(authStart());

    try {
      const data = await loginUser(
        credentials,
      );

      dispatch(loginSuccess(data));

      return data;
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        "Login failed.";

      dispatch(authFailure(message));

      throw error;
    }
  };

  const loginWithGoogle = async (credential) => {
    dispatch(authStart());

    try {
      const data = await googleAuthUser({ credential });

      dispatch(loginSuccess(data));

      return data;
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        "Google authentication failed.";

      dispatch(authFailure(message));

      throw error;
    }
  };

  const register = async (userData) => {
    dispatch(authStart());

    try {
      const data =
        await registerUser(userData);

      dispatch(authFailure(null));

      return data;
    } catch (error) {
      const data = error.response?.data;

      dispatch(
        authFailure(
          data || "Registration failed.",
        ),
      );

      throw error;
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const user =
        await getCurrentUser();

      dispatch(setUser(user));

      return user;
    } catch (error) {
      dispatch(logoutAction());

      throw error;
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await logoutUser(refreshToken);
      } catch (error) {
        console.error("Failed to blacklist refresh token on logout", error);
      }
    }
    dispatch(logoutAction());
  };

  return {
    ...auth,
    login,
    loginWithGoogle,
    register,
    fetchCurrentUser,
    logout,
  };
};
