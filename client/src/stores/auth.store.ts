import { create } from "zustand";

import type { AuthState, AuthUser } from "../features/auth/auth.types";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshSession,
} from "../features/auth/auth.service";

import { ApiError } from "../services/api";

const AUTH_CACHE_KEY = "mindvault_offline_user";

function saveCachedUser(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Could not save offline profile:", error);
  }
}

function getCachedUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);

    if (!stored) {
      return null;
    }

    const user = JSON.parse(stored) as AuthUser;

    if (
      typeof user.id !== "string" ||
      !/^[a-fA-F0-9]{24}$/.test(user.id) ||
      typeof user.name !== "string" ||
      user.name.length < 2 ||
      user.name.length > 80 ||
      typeof user.email !== "string" ||
      user.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) ||
      typeof user.preferredLanguage !== "string" ||
      user.preferredLanguage.length < 2 ||
      user.preferredLanguage.length > 20
    ) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

function clearCachedUser(): void {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
  } catch (error) {
    console.error("Could not clear offline profile:", error);
  }
}

function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

function isServerOrNetworkError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 0 || error.status >= 500)
  );
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // REGISTER
  register: async (data) => {
    const user = await registerUser(data);

    saveCachedUser(user);

    set({
      user,
      isAuthenticated: true,
    });
  },

  // LOGIN
  login: async (data) => {
    const user = await loginUser(data);

    saveCachedUser(user);

    set({
      user,
      isAuthenticated: true,
    });
  },

  // LOGOUT
  logout: async () => {
    try {
      if (navigator.onLine) {
        await logoutUser();
      }
    } catch (error) {
      console.error("Server logout failed:", error);
    } finally {
      clearCachedUser();

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // INITIALIZE AUTHENTICATION
  initializeAuth: async () => {
    set({ isLoading: true });

    const cachedUser = getCachedUser();

    // Restore the local profile immediately when offline.
    if (!navigator.onLine) {
      set({
        user: cachedUser,
        isAuthenticated: !!cachedUser,
        isLoading: false,
      });

      return;
    }

    try {
      // First, check the existing access token.
      const user = await getCurrentUser();

      saveCachedUser(user);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return;
    } catch (error) {
      // Only attempt refresh when authentication has expired.
      if (isAuthenticationError(error)) {
        try {
          await refreshSession();

          const user = await getCurrentUser();

          saveCachedUser(user);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          return;
        } catch (refreshError) {
          // Expired or invalid refresh token.
          if (isAuthenticationError(refreshError)) {
            clearCachedUser();

            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            return;
          }

          // Server outage or network failure.
          if (isServerOrNetworkError(refreshError)) {
            set({
              user: cachedUser,
              isAuthenticated: !!cachedUser,
              isLoading: false,
            });

            return;
          }
        }
      }

      // Handle server errors and network failures.
      if (isServerOrNetworkError(error)) {
        set({
          user: cachedUser,
          isAuthenticated: !!cachedUser,
          isLoading: false,
        });

        return;
      }

      // Unexpected authentication failure.
      clearCachedUser();

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
