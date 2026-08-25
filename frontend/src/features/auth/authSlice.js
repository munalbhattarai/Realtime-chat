import { createSlice } from "@reduxjs/toolkit";

const getStoredToken = (key) =>
  localStorage.getItem(key);

const initialState = {
  accessToken: getStoredToken("access_token"),
  refreshToken: getStoredToken("refresh_token"),
  user: null,
  isAuthenticated: Boolean(
    getStoredToken("access_token"),
  ),
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    authStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    loginSuccess: (state, action) => {
      const {
        access,
        refresh,
        user,
      } = action.payload;

      state.accessToken = access;
      state.refreshToken = refresh;
      state.user = user;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;

      localStorage.setItem(
        "access_token",
        access,
      );

      localStorage.setItem(
        "refresh_token",
        refresh,
      );
    },

    setAccessToken: (state, action) => {
      state.accessToken = action.payload;

      localStorage.setItem(
        "access_token",
        action.payload,
      );
    },

    setUser: (state, action) => {
      if (state.user && action.payload?.profile !== undefined) {
        // Partial update (e.g. from a WebSocket profile.update event)
        state.user = {
          ...state.user,
          ...action.payload,
          profile: {
            ...state.user.profile,
            ...action.payload.profile,
          },
        };
      } else {
        state.user = action.payload;
      }
    },

    authFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    clearAuthError: (state) => {
      state.error = null;
    },

    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    },
  },
});

export const {
  authStart,
  loginSuccess,
  setAccessToken,
  setUser,
  authFailure,
  clearAuthError,
  logout,
} = authSlice.actions;

export default authSlice.reducer;