import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ApiError } from "../services/api";

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
} from "../features/auth/auth.service";

import {
  initializeUserDatabase,
  closeUserDatabase,
} from "../db/database";

import { useAuthStore } from "./auth.store";

vi.mock("../features/auth/auth.service", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  getCurrentUser: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock("../db/database", () => ({
  initializeUserDatabase: vi.fn(),
  closeUserDatabase: vi.fn(),
}));

const mockedLoginUser = vi.mocked(loginUser);
const mockedLogoutUser = vi.mocked(logoutUser);
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedRefreshSession = vi.mocked(refreshSession);

const mockedInitializeUserDatabase = vi.mocked(
  initializeUserDatabase
);
const mockedCloseUserDatabase = vi.mocked(closeUserDatabase);

const validUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Test User",
  email: "test@example.com",
  preferredLanguage: "en",
};

const AUTH_CACHE_KEY = "mindvault_offline_user";
const AUTH_LOGOUT_PENDING_KEY = "mindvault_logout_pending";

let storage: Map<string, string>;

const setOnlineStatus = (online: boolean): void => {
  vi.stubGlobal("navigator", {
    onLine: online,
  });
};

const saveTestUser = (): void => {
  storage.set(AUTH_CACHE_KEY, JSON.stringify(validUser));
};

beforeEach(() => {
  vi.clearAllMocks();

  storage = new Map<string, string>();

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
  });

  setOnlineStatus(true);

  mockedInitializeUserDatabase.mockResolvedValue(undefined);
  mockedCloseUserDatabase.mockResolvedValue(undefined);

  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isDatabaseReady: false,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Authentication store", () => {
  it("stores the user after successful login and initializes their database", async () => {
    mockedLoginUser.mockResolvedValue(validUser);

    await useAuthStore.getState().login({
      email: "test@example.com",
      password: "StrongPassword123",
    });

    const state = useAuthStore.getState();

    expect(mockedInitializeUserDatabase).toHaveBeenCalledWith(
      validUser.id
    );
    expect(state.user).toEqual(validUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isDatabaseReady).toBe(true);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(true);
  });

  it("does not authenticate when login fails", async () => {
    mockedLoginUser.mockRejectedValue(
      new ApiError("Invalid credentials.", 401)
    );

    await expect(
      useAuthStore.getState().login({
        email: "test@example.com",
        password: "WrongPassword123",
      })
    ).rejects.toThrow();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
    expect(mockedInitializeUserDatabase).not.toHaveBeenCalled();
  });

  it("does not authenticate if account database initialization fails", async () => {
    mockedLoginUser.mockResolvedValue(validUser);

    mockedInitializeUserDatabase.mockRejectedValue(
      new Error("IndexedDB unavailable.")
    );

    await expect(
      useAuthStore.getState().login({
        email: "test@example.com",
        password: "StrongPassword123",
      })
    ).rejects.toThrow("IndexedDB unavailable.");

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
    expect(mockedCloseUserDatabase).toHaveBeenCalledOnce();
  });

  it("restores the cached profile and initializes its database when offline", async () => {
    saveTestUser();
    setOnlineStatus(false);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(mockedInitializeUserDatabase).toHaveBeenCalledWith(
      validUser.id
    );
    expect(state.user).toEqual(validUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isDatabaseReady).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(mockedGetCurrentUser).not.toHaveBeenCalled();
  });

  it("does not authenticate offline without a cached profile", async () => {
    setOnlineStatus(false);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(mockedInitializeUserDatabase).not.toHaveBeenCalled();
  });

  it("refreshes an expired access session", async () => {
    mockedGetCurrentUser
      .mockRejectedValueOnce(
        new ApiError("Unauthorized.", 401)
      )
      .mockResolvedValueOnce(validUser);

    mockedRefreshSession.mockResolvedValue(undefined);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(mockedRefreshSession).toHaveBeenCalledOnce();
    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(2);
    expect(mockedInitializeUserDatabase).toHaveBeenCalledWith(
      validUser.id
    );
    expect(state.user).toEqual(validUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isDatabaseReady).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("clears the cached profile when refresh authentication fails", async () => {
    saveTestUser();

    mockedGetCurrentUser.mockRejectedValue(
      new ApiError("Unauthorized.", 401)
    );

    mockedRefreshSession.mockRejectedValue(
      new ApiError("Invalid refresh token.", 401)
    );

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(false);
  });

  it("preserves the cached profile during a server outage", async () => {
    saveTestUser();

    mockedGetCurrentUser.mockRejectedValue(
      new ApiError("Server unavailable.", 503)
    );

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(mockedInitializeUserDatabase).toHaveBeenCalledWith(
      validUser.id
    );
    expect(state.user).toEqual(validUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isDatabaseReady).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(true);
  });

  it("does not authenticate if offline database initialization fails", async () => {
    saveTestUser();
    setOnlineStatus(false);

    mockedInitializeUserDatabase.mockRejectedValue(
      new Error("IndexedDB unavailable.")
    );

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("closes the account database when logging out offline", async () => {
    saveTestUser();
    setOnlineStatus(false);

    useAuthStore.setState({
      user: validUser,
      isAuthenticated: true,
      isLoading: false,
      isDatabaseReady: true,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();

    expect(mockedLogoutUser).not.toHaveBeenCalled();
    expect(mockedCloseUserDatabase).toHaveBeenCalledOnce();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(false);
    expect(storage.get(AUTH_LOGOUT_PENDING_KEY)).toBe("true");
  });

  it("clears local authentication even if server logout fails", async () => {
    saveTestUser();

    useAuthStore.setState({
      user: validUser,
      isAuthenticated: true,
      isLoading: false,
      isDatabaseReady: true,
    });

    mockedLogoutUser.mockRejectedValue(
      new ApiError("Server unavailable.", 503)
    );

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();

    expect(mockedCloseUserDatabase).toHaveBeenCalledOnce();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(false);
    expect(storage.get(AUTH_LOGOUT_PENDING_KEY)).toBe("true");
  });
    it("does not restore an account after an offline logout and reload", async () => {
    saveTestUser();

    storage.set(AUTH_LOGOUT_PENDING_KEY, "true");

    setOnlineStatus(false);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(mockedInitializeUserDatabase).not.toHaveBeenCalled();
    expect(mockedGetCurrentUser).not.toHaveBeenCalled();
    expect(mockedCloseUserDatabase).toHaveBeenCalledOnce();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
    expect(state.isLoading).toBe(false);

    expect(storage.has(AUTH_CACHE_KEY)).toBe(false);
    expect(storage.get(AUTH_LOGOUT_PENDING_KEY)).toBe("true");
  });

  it("retries pending server logout when the connection returns", async () => {
    saveTestUser();

    storage.set(AUTH_LOGOUT_PENDING_KEY, "true");

    setOnlineStatus(true);

    mockedLogoutUser.mockResolvedValue(undefined);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(mockedLogoutUser).toHaveBeenCalledOnce();
    expect(mockedGetCurrentUser).not.toHaveBeenCalled();
    expect(mockedInitializeUserDatabase).not.toHaveBeenCalled();

    expect(storage.has(AUTH_LOGOUT_PENDING_KEY)).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(false);

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("preserves pending logout when the server is still unavailable", async () => {
    saveTestUser();

    storage.set(AUTH_LOGOUT_PENDING_KEY, "true");

    setOnlineStatus(true);

    mockedLogoutUser.mockRejectedValue(
      new ApiError("Server unavailable.", 503)
    );

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();

    expect(mockedLogoutUser).toHaveBeenCalledOnce();
    expect(mockedGetCurrentUser).not.toHaveBeenCalled();
    expect(mockedInitializeUserDatabase).not.toHaveBeenCalled();

    expect(storage.has(AUTH_CACHE_KEY)).toBe(false);
    expect(storage.get(AUTH_LOGOUT_PENDING_KEY)).toBe("true");

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isDatabaseReady).toBe(false);
  });

  it("allows a deliberate new login after pending logout", async () => {
    storage.set(AUTH_LOGOUT_PENDING_KEY, "true");

    mockedLoginUser.mockResolvedValue(validUser);

    await useAuthStore.getState().login({
      email: "test@example.com",
      password: "StrongPassword123",
    });

    const state = useAuthStore.getState();

    expect(mockedLoginUser).toHaveBeenCalledOnce();
    expect(mockedInitializeUserDatabase).toHaveBeenCalledWith(
      validUser.id
    );

    expect(storage.has(AUTH_LOGOUT_PENDING_KEY)).toBe(false);
    expect(storage.has(AUTH_CACHE_KEY)).toBe(true);

    expect(state.user).toEqual(validUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isDatabaseReady).toBe(true);
  });
});