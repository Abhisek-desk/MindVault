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

import { initializeUserDatabase, closeUserDatabase } from "../db/database";

import { withAccountSessionLock } from "../services/account-session-lock";

const AUTH_CACHE_KEY = "mindvault_offline_user";
const AUTH_CHANNEL_NAME = "mindvault-auth";
const AUTH_LOGOUT_PENDING_KEY = "mindvault_logout_pending";

let authenticationGeneration = 0;

// =====================================
// AUTHENTICATION CACHE
// =====================================

function saveCachedUser(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
  } catch {
    if (import.meta.env.DEV) {
      console.error("Could not save offline profile.");
    }
  }
}

function getCachedUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);

    if (!stored) return null;

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
  } catch {
    if (import.meta.env.DEV) {
      console.error("Could not clear offline profile.");
    }
  }
}

// =====================================
// PENDING LOGOUT PROTECTION
// =====================================

function hasPendingLogout(): boolean {
  try {
    return localStorage.getItem(AUTH_LOGOUT_PENDING_KEY) === "true";
  } catch {
    // Fail closed if storage cannot be checked.
    return true;
  }
}

function setPendingLogout(): void {
  localStorage.setItem(AUTH_LOGOUT_PENDING_KEY, "true");
}

function clearPendingLogout(): void {
  localStorage.removeItem(AUTH_LOGOUT_PENDING_KEY);
}

// =====================================
// AUTHENTICATION HELPERS
// =====================================

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

async function activateUserDatabase(user: AuthUser): Promise<void> {
  await initializeUserDatabase(user.id);
}

// =====================================
// CROSS-TAB NOTIFICATIONS
// =====================================

function notifyOtherTabs(): void {
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);

      channel.postMessage({ type: "SESSION_CHANGED" });

      channel.close();
    }

    localStorage.setItem(
      `${AUTH_CACHE_KEY}_event`,
      `${Date.now()}-${Math.random()}`,
    );
  } catch {
    if (import.meta.env.DEV) {
      console.error("Could not notify other browser tabs.");
    }
  }
}

// =====================================
// AUTHENTICATION STORE
// =====================================

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isDatabaseReady: false,

  // =================================
  // REGISTER
  // =================================

  register: async (data) => {
    const generation = ++authenticationGeneration;

    set({
      user: null,
      isAuthenticated: false,
      isDatabaseReady: false,
      isLoading: true,
    });

    try {
      await withAccountSessionLock(async () => {
        const user = await registerUser(data);

        if (generation !== authenticationGeneration) return;

        clearPendingLogout();
        clearCachedUser();

        await activateUserDatabase(user);

        if (generation !== authenticationGeneration) {
          await closeUserDatabase();
          return;
        }

        saveCachedUser(user);

        set({
          user,
          isAuthenticated: true,
          isDatabaseReady: true,
          isLoading: false,
        });

        notifyOtherTabs();
      });
    } catch (error) {
      if (generation === authenticationGeneration) {
        await closeUserDatabase().catch(() => undefined);

        set({
          user: null,
          isAuthenticated: false,
          isDatabaseReady: false,
          isLoading: false,
        });
      }

      throw error;
    }
  },

  // =================================
  // LOGIN
  // =================================

  login: async (data) => {
    const generation = ++authenticationGeneration;

    set({
      user: null,
      isAuthenticated: false,
      isDatabaseReady: false,
      isLoading: true,
    });

    try {
      await withAccountSessionLock(async () => {
        const user = await loginUser(data);

        if (generation !== authenticationGeneration) return;

        clearPendingLogout();
        clearCachedUser();

        await activateUserDatabase(user);

        if (generation !== authenticationGeneration) {
          await closeUserDatabase();
          return;
        }

        saveCachedUser(user);

        set({
          user,
          isAuthenticated: true,
          isDatabaseReady: true,
          isLoading: false,
        });

        notifyOtherTabs();
      });
    } catch (error) {
      if (generation === authenticationGeneration) {
        await closeUserDatabase().catch(() => undefined);

        set({
          user: null,
          isAuthenticated: false,
          isDatabaseReady: false,
          isLoading: false,
        });
      }

      throw error;
    }
  },

  // =================================
  // LOGOUT
  // =================================

  logout: async () => {
    const generation = ++authenticationGeneration;

    // Immediately disable the local account.
    set({
      user: null,
      isAuthenticated: false,
      isDatabaseReady: false,
      isLoading: false,
    });

    // Persist logout intent before attempting server logout.
    try {
      setPendingLogout();
    } catch {
      if (import.meta.env.DEV) {
        console.error("Could not persist logout protection.");
      }
    }

    clearCachedUser();

    try {
      await withAccountSessionLock(async () => {
        await closeUserDatabase();

        if (navigator.onLine) {
          try {
            await logoutUser();
            clearPendingLogout();
          } catch {
            if (import.meta.env.DEV) {
              console.error("Server logout failed. Logout will be retried.");
            }
          }
        }

        notifyOtherTabs();
      });
    } catch {
      if (import.meta.env.DEV) {
        console.error("Could not complete account logout.");
      }

      await closeUserDatabase().catch(() => undefined);
    }

    if (generation !== authenticationGeneration) return;

    set({
      user: null,
      isAuthenticated: false,
      isDatabaseReady: false,
      isLoading: false,
    });
  },

  // =================================
  // INITIALIZE AUTHENTICATION
  // =================================

  initializeAuth: async () => {
    const generation = ++authenticationGeneration;

    set({
      isLoading: true,
      isDatabaseReady: false,
    });

    try {
      await withAccountSessionLock(async () => {
        const cachedUser = getCachedUser();

        // A previous offline logout must never restore the old account.
        if (hasPendingLogout()) {
          clearCachedUser();

          if (navigator.onLine) {
            try {
              await logoutUser();
              clearPendingLogout();
            } catch {
              if (import.meta.env.DEV) {
                console.error("Pending server logout could not be completed.");
              }
            }
          }

          await closeUserDatabase();

          if (generation === authenticationGeneration) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isDatabaseReady: false,
            });
          }

          return;
        }

        // Restore cached account while offline.
        if (!navigator.onLine) {
          if (!cachedUser) {
            await closeUserDatabase();

            if (generation === authenticationGeneration) {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isDatabaseReady: false,
              });
            }

            return;
          }

          await activateUserDatabase(cachedUser);

          if (generation === authenticationGeneration) {
            set({
              user: cachedUser,
              isAuthenticated: true,
              isLoading: false,
              isDatabaseReady: true,
            });
          }

          return;
        }

        let authenticatedUser: AuthUser | null = null;

        try {
          authenticatedUser = await getCurrentUser();
        } catch (error) {
          if (isAuthenticationError(error)) {
            try {
              await refreshSession();

              authenticatedUser = await getCurrentUser();
            } catch (refreshError) {
              if (isAuthenticationError(refreshError)) {
                clearCachedUser();
              } else if (isServerOrNetworkError(refreshError)) {
                authenticatedUser = cachedUser;
              } else {
                clearCachedUser();
              }
            }
          } else if (isServerOrNetworkError(error)) {
            authenticatedUser = cachedUser;
          } else {
            clearCachedUser();
          }
        }

        if (generation !== authenticationGeneration) return;

        if (!authenticatedUser) {
          await closeUserDatabase();

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isDatabaseReady: false,
          });

          return;
        }

        await activateUserDatabase(authenticatedUser);

        if (generation !== authenticationGeneration) {
          await closeUserDatabase();
          return;
        }

        saveCachedUser(authenticatedUser);

        set({
          user: authenticatedUser,
          isAuthenticated: true,
          isLoading: false,
          isDatabaseReady: true,
        });
      });
    } catch {
      if (generation === authenticationGeneration) {
        await closeUserDatabase().catch(() => undefined);

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isDatabaseReady: false,
        });

        if (import.meta.env.DEV) {
          console.error("Authentication initialization failed.");
        }
      }
    }
  },
}));

// =====================================
// CROSS-TAB SESSION NOTIFICATIONS
// =====================================

if (typeof window !== "undefined") {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);

    channel.addEventListener("message", (event: MessageEvent) => {
      if (event.data?.type === "SESSION_CHANGED") {
        void useAuthStore.getState().initializeAuth();
      }
    });
  }

  window.addEventListener("storage", (event: StorageEvent) => {
    if (
      event.key === `${AUTH_CACHE_KEY}_event` ||
      event.key === AUTH_LOGOUT_PENDING_KEY
    ) {
      void useAuthStore.getState().initializeAuth();
    }
  });
}
