import { create } from "zustand";

import type {
  AuthState
} from "../features/auth/auth.types";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshSession
} from "../features/auth/auth.service";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // REGISTER
  register: async (data) => {
    const user = await registerUser(data);

    set({
      user,
      isAuthenticated: true
    });
  },

  // LOGIN
  login: async (data) => {
    const user = await loginUser(data);

    set({
      user,
      isAuthenticated: true
    });
  },

  // LOGOUT
  logout: async () => {
    try {
      await logoutUser();
    } finally {
      set({
        user: null,
        isAuthenticated: false
      });
    }
  },

  // INITIALIZE AUTHENTICATION
  initializeAuth: async () => {
    set({ isLoading: true });

    try {
      let user;

      try {
        // First check whether the access token is valid.
        user = await getCurrentUser();
      } catch {
        // If expired, try refreshing the session.
        await refreshSession();

        user = await getCurrentUser();
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });

    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }
}));